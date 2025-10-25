#!/bin/bash
# PostgreSQL Replication Monitoring Script
# Usage: ./monitor-replication.sh [--watch]

set -e

WATCH_MODE=false
if [[ "$1" == "--watch" ]]; then
    WATCH_MODE=true
fi

show_status() {
    clear
    echo "========================================="
    echo " PostgreSQL Replication Monitor"
    echo " $(date '+%Y-%m-%d %H:%M:%S CST')"
    echo "========================================="
    echo ""

    # Master Container Status
    echo "📦 Container Status"
    echo "-----------------------------------------"
    echo "Master:"
    docker ps --filter name=ai_postgres_prod --format "  Status: {{.Status}}" | head -1
    echo "Slave:"
    docker ps --filter name=ai_postgres_slave --format "  Status: {{.Status}}" | head -1
    echo ""

    # Replication Status from Master
    echo "🔄 Replication Status (Master View)"
    echo "-----------------------------------------"
    docker exec -i ai_postgres_prod psql -U ai_prod_user -d ai_project_prod -t -A -F'|' -c "
    SELECT
        COALESCE(client_addr::text, 'N/A') as client,
        COALESCE(application_name, 'N/A') as app,
        COALESCE(state, 'N/A') as state,
        COALESCE(sync_state, 'N/A') as sync,
        COALESCE(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)::text, '0') as lag_bytes,
        COALESCE(replay_lag::text, '0') as replay_lag
    FROM pg_stat_replication;
    " | while IFS='|' read client app state sync lag_bytes replay_lag; do
        if [[ -n "$client" ]]; then
            echo "  Client IP:     $client"
            echo "  App Name:      $app"
            echo "  State:         $state"
            echo "  Sync Mode:     $sync"
            echo "  Lag (bytes):   $lag_bytes"
            echo "  Replay Lag:    $replay_lag"
        fi
    done

    # Check if no replication
    REPL_COUNT=$(docker exec -i ai_postgres_prod psql -U ai_prod_user -d ai_project_prod -t -A -c "SELECT COUNT(*) FROM pg_stat_replication;")
    if [[ "$REPL_COUNT" == "0" ]]; then
        echo "  ⚠️  WARNING: No replication connections!"
    fi
    echo ""

    # Slave Recovery Status
    echo "💾 Slave Status"
    echo "-----------------------------------------"
    docker exec -i ai_postgres_slave psql -U ai_prod_user -d ai_project_prod -t -A -F'|' -c "
    SELECT
        pg_is_in_recovery()::text,
        COALESCE(pg_last_wal_receive_lsn()::text, 'N/A'),
        COALESCE(pg_last_wal_replay_lsn()::text, 'N/A'),
        COALESCE(pg_last_xact_replay_timestamp()::text, 'N/A')
    ;
    " | while IFS='|' read is_recovery receive_lsn replay_lsn last_replay; do
        if [[ "$is_recovery" == "t" ]]; then
            echo "  Mode:          🟢 Standby (Recovery)"
        else
            echo "  Mode:          🔴 ERROR: Not in recovery mode!"
        fi
        echo "  Receive LSN:   $receive_lsn"
        echo "  Replay LSN:    $replay_lsn"
        echo "  Last Replay:   $last_replay"
    done
    echo ""

    # Replication Slot Status
    echo "🎰 Replication Slot Status"
    echo "-----------------------------------------"
    docker exec -i ai_postgres_prod psql -U ai_prod_user -d ai_project_prod -t -A -F'|' -c "
    SELECT
        slot_name,
        slot_type,
        active::text,
        COALESCE(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)::text, '0') as retained_bytes
    FROM pg_replication_slots
    WHERE slot_name = 'slave_slot_1';
    " | while IFS='|' read slot_name slot_type active retained; do
        echo "  Slot Name:     $slot_name"
        echo "  Type:          $slot_type"
        if [[ "$active" == "t" ]]; then
            echo "  Active:        🟢 Yes"
        else
            echo "  Active:        🔴 No"
        fi
        echo "  Retained WAL:  $retained bytes"
    done
    echo ""

    # Database Statistics
    echo "📊 Database Statistics"
    echo "-----------------------------------------"
    echo "Master:"
    docker exec -i ai_postgres_prod psql -U ai_prod_user -d ai_project_prod -t -A -F'|' -c "
    SELECT
        pg_database_size('ai_project_prod'),
        numbackends,
        xact_commit,
        xact_rollback
    FROM pg_stat_database
    WHERE datname = 'ai_project_prod';
    " | while IFS='|' read size backends commits rollbacks; do
        size_mb=$((size / 1024 / 1024))
        echo "  DB Size:       ${size_mb} MB"
        echo "  Connections:   $backends"
        echo "  Commits:       $commits"
        echo "  Rollbacks:     $rollbacks"
    done

    echo ""
    echo "Slave:"
    docker exec -i ai_postgres_slave psql -U ai_prod_user -d ai_project_prod -t -A -F'|' -c "
    SELECT
        pg_database_size('ai_project_prod'),
        numbackends
    FROM pg_stat_database
    WHERE datname = 'ai_project_prod';
    " | while IFS='|' read size backends; do
        size_mb=$((size / 1024 / 1024))
        echo "  DB Size:       ${size_mb} MB"
        echo "  Connections:   $backends"
    done
    echo ""

    # Archive Status
    echo "📁 WAL Archive Status"
    echo "-----------------------------------------"
    docker exec -i ai_postgres_prod psql -U ai_prod_user -d ai_project_prod -t -A -F'|' -c "
    SELECT
        COALESCE(archived_count::text, '0'),
        COALESCE(failed_count::text, '0'),
        COALESCE(last_archived_wal, 'N/A'),
        COALESCE(last_archived_time::text, 'N/A')
    FROM pg_stat_archiver;
    " | while IFS='|' read archived failed last_wal last_time; do
        echo "  Archived:      $archived files"
        echo "  Failed:        $failed files"
        echo "  Last WAL:      $last_wal"
        echo "  Last Time:     $last_time"
    done
    echo ""

    # Health Summary
    echo "✅ Health Summary"
    echo "-----------------------------------------"

    HEALTH_SCORE=0
    ISSUES=()

    # Check master container
    MASTER_RUNNING=$(docker ps --filter name=ai_postgres_prod --filter status=running -q)
    if [[ -n "$MASTER_RUNNING" ]]; then
        ((HEALTH_SCORE+=20))
    else
        ISSUES+=("Master container not running")
    fi

    # Check slave container
    SLAVE_RUNNING=$(docker ps --filter name=ai_postgres_slave --filter status=running -q)
    if [[ -n "$SLAVE_RUNNING" ]]; then
        ((HEALTH_SCORE+=20))
    else
        ISSUES+=("Slave container not running")
    fi

    # Check replication connection
    if [[ "$REPL_COUNT" -gt 0 ]]; then
        ((HEALTH_SCORE+=30))
    else
        ISSUES+=("No replication connections")
    fi

    # Check replication lag
    LAG_BYTES=$(docker exec -i ai_postgres_prod psql -U ai_prod_user -d ai_project_prod -t -A -c "SELECT COALESCE(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn), 0) FROM pg_stat_replication LIMIT 1;" 2>/dev/null || echo "999999999")
    if [[ "$LAG_BYTES" -lt 10000 ]]; then
        ((HEALTH_SCORE+=30))
    elif [[ "$LAG_BYTES" -lt 100000 ]]; then
        ((HEALTH_SCORE+=15))
        ISSUES+=("Replication lag > 10KB")
    else
        ISSUES+=("Replication lag > 100KB")
    fi

    # Display health score
    if [[ $HEALTH_SCORE -ge 90 ]]; then
        echo "  Overall:       🟢 Excellent ($HEALTH_SCORE/100)"
    elif [[ $HEALTH_SCORE -ge 70 ]]; then
        echo "  Overall:       🟡 Good ($HEALTH_SCORE/100)"
    elif [[ $HEALTH_SCORE -ge 50 ]]; then
        echo "  Overall:       🟠 Warning ($HEALTH_SCORE/100)"
    else
        echo "  Overall:       🔴 Critical ($HEALTH_SCORE/100)"
    fi

    if [[ ${#ISSUES[@]} -gt 0 ]]; then
        echo ""
        echo "  Issues Found:"
        for issue in "${ISSUES[@]}"; do
            echo "    - $issue"
        done
    fi

    echo ""
    echo "========================================="
    if [[ "$WATCH_MODE" == "true" ]]; then
        echo "Press Ctrl+C to exit (refreshing in 5s)"
    fi
}

if [[ "$WATCH_MODE" == "true" ]]; then
    while true; do
        show_status
        sleep 5
    done
else
    show_status
fi
