package monitoring

import (
	"log"
)

func init() {
	log.Println("[MONITORING] Permission metrics package initialized")
	log.Println("[MONITORING] Registered metrics:")
	log.Println("[MONITORING] - permission_check_duration_seconds")
	log.Println("[MONITORING] - permission_db_query_total")
	log.Println("[MONITORING] - permission_error_total")
	log.Println("[MONITORING] - permission_cache_hits_total")
	log.Println("[MONITORING] - permission_cache_misses_total")
	log.Println("[MONITORING] - permission_operation_total")
	log.Println("[MONITORING] - permission_active_requests")
}
