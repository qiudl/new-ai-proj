# Database Table Cleanup Plan

## Analysis Summary
Date: 2025-09-07
Total tables in database: 55

## Table Categories Identified

### 1. IMMEDIATE CLEANUP - Safe to Delete
These tables have no dependencies or contain only test/backup data:

| Table Name | Type | Records | Status | Risk Level |
|------------|------|---------|---------|------------|
| `departments_backup_20250905` | Backup | 10 | Safe to delete | LOW |
| `ai_test_logs` | Test | 0 | Safe to delete | LOW |
| `replication_test` | Test | 1 | Safe to delete | LOW |

### 2. LEGACY SYSTEMS - Requires Careful Analysis
These are old system tables that may still have dependencies:

#### Customer System (Legacy)
| Table Name | Records | Dependencies | Status |
|------------|---------|--------------|---------|
| `customers` | 22 | Referenced by users, documents, project_companies | **KEEP - ACTIVE** |
| `customer_contacts` | 5 | References users table | **KEEP - ACTIVE** |
| `customer_users` | 3 | References users table | **KEEP - ACTIVE** |

#### Company System (Legacy/Transitional)
| Table Name | Records | Dependencies | Status |
|------------|---------|--------------|---------|
| `companies` | 2 | Referenced by company_departments, users | **KEEP - ACTIVE** |
| `company_departments` | 18 | Has complex FK relationships | **KEEP - ACTIVE** |
| `company_users` | 17 | Referenced by permissions, audit logs | **KEEP - ACTIVE** |
| `company_roles` | 22 | Referenced by company_users, permissions | **KEEP - ACTIVE** |

#### Enterprise System (New)
| Table Name | Records | Status |
|------------|---------|---------|
| `enterprises` | 13 | **ACTIVE - NEW SYSTEM** |
| `enterprise_users` | 19 | **ACTIVE - NEW SYSTEM** |
| `enterprise_departments` | 34 | **ACTIVE - NEW SYSTEM** |

## Dependency Analysis

### Critical Dependencies Found:
1. **5,624 users** still reference the old company system
2. **3 project_companies** records are active
3. **Permission system** still uses company_users table
4. **Audit logs** reference company_users

### Safe Cleanup Dependencies:
- `departments_backup_20250905`: No foreign key references
- `ai_test_logs`: No foreign key references  
- `replication_test`: No foreign key references

## Cleanup Execution Plan

### Phase 1: Immediate Safe Cleanup ✅
**Target**: Test and backup tables with no dependencies
**Risk**: VERY LOW
**Tables**: 
- `departments_backup_20250905`
- `ai_test_logs` 
- `replication_test`

### Phase 2: Legacy System Migration Analysis ⏳
**Target**: Analyze if legacy customer/company systems can be safely deprecated
**Risk**: HIGH - Active dependencies exist
**Actions Needed**:
1. Complete migration of users from company system to enterprise system
2. Update permission system to use enterprise_users
3. Migrate project associations to enterprise system
4. Update audit logging to track enterprise users

### Phase 3: Post-Migration Cleanup ⏳
**Target**: Remove legacy tables after successful migration
**Risk**: MEDIUM - Only after Phase 2 completion
**Tables for future cleanup**:
- Legacy customer system tables (if fully migrated)
- Legacy company system tables (if fully migrated)

## Recommended Actions

### Immediate Actions (Safe) - COMPLETED ✅
1. ✅ **COMPLETED** - Deleted backup table: `departments_backup_20250905` 
2. ✅ **COMPLETED** - Deleted test tables: `ai_test_logs`, `replication_test`

### Cleanup Results
- **Tables removed**: 3
- **Database tables before**: 55
- **Database tables after**: 52
- **Space reclaimed**: ~96 kB (minimal, as expected for test/backup tables)
- **Execution date**: 2025-09-07
- **Status**: Successfully completed Phase 1 cleanup

### Required Before Legacy Cleanup
1. ❌ **Do NOT delete customer/company tables yet** - Active dependencies exist
2. 🔄 Complete enterprise migration project first
3. 🔄 Update all references from company_users to enterprise_users
4. 🔄 Migrate permission system to enterprise architecture

## SQL Execution Order (Phase 1 Only)

```sql
-- Phase 1: Safe cleanup only
-- No foreign key constraints to worry about

-- 1. Drop test tables (no dependencies)
DROP TABLE IF EXISTS ai_test_logs;
DROP TABLE IF EXISTS replication_test;

-- 2. Drop backup table (no dependencies) 
DROP TABLE IF EXISTS departments_backup_20250905;
```

## Post-Cleanup Verification

After Phase 1 cleanup:
- [ ] Verify no broken references
- [ ] Confirm application still functions normally  
- [ ] Update table count documentation
- [ ] Monitor for any issues

## Future Migration Strategy

For Phase 2 (Legacy System Cleanup):
1. Complete the enterprise user system migration
2. Update all application code to use enterprise tables
3. Create migration scripts to move data
4. Test thoroughly in staging environment
5. Only then proceed with legacy table cleanup

## Notes

- The system is currently in a **transitional state** with both old and new systems active
- Legacy cleanup should wait until enterprise migration is **100% complete**
- Current cleanup is **conservative** to prevent data loss or system breakage
- Total space savings from Phase 1: ~minimal (test/backup tables only)
- Major space savings will come from Phase 2 (legacy system cleanup)