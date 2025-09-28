import api from './api';

interface ValidationRequest {
    user_id?: number;
    quick?: boolean;
}

interface ValidationResult {
    check_name: string;
    status: 'pass' | 'warning' | 'error';
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    affected_ids?: number[];
}

interface ValidationReport {
    total_checks: number;
    passed_checks: number;
    warning_checks: number;
    error_checks: number;
    overall_score: number;
    overall_status: 'healthy' | 'warning' | 'critical';
    validation_results: ValidationResult[];
    generated_at: string;
    user_id: number;
    summary: {
        total_timer_sessions: number;
        valid_sessions: number;
        data_quality_score: number;
        recommended_actions: string[];
        health_metrics: Record<string, any>;
        last_healthy_data_date?: string;
        efficiency_calculatable: boolean;
    };
}

interface HealthMetrics {
    status: 'pass' | 'warning' | 'error';
    score: number;
    recent_sessions: number;
    active_days: number;
    valid_sessions: number;
    efficiency_available: boolean;
    last_checked: string;
    recommendations: string[];
}

interface ValidationStatus {
    status: 'pass' | 'warning' | 'error';
    message: string;
    severity: string;
    last_checked: string;
    data_available: boolean;
    efficiency_ready: boolean;
}

interface ValidationSummary {
    overall_score: number;
    overall_status: string;
    total_checks: number;
    passed_checks: number;
    warning_checks: number;
    error_checks: number;
    data_quality_score: number;
    efficiency_ready: boolean;
    recommended_actions: string[];
    last_updated: string;
}

export const dataValidationService = {
    /**
     * Get comprehensive data validation report
     */
    async getValidationReport(quick?: boolean): Promise<{
        success: boolean;
        type: string;
        report?: ValidationReport;
        result?: ValidationResult;
        message: string;
    }> {
        const params = quick ? '?quick=true' : '';
        return api.get(`/data-validation/report${params}`);
    },

    /**
     * Get quick validation status
     */
    async getValidationStatus(): Promise<{
        success: boolean;
        status: ValidationStatus;
        message: string;
    }> {
        return api.get('/data-validation/status');
    },

    /**
     * Run data validation manually
     */
    async runValidation(request: ValidationRequest): Promise<{
        success: boolean;
        type: string;
        report?: ValidationReport;
        result?: ValidationResult;
        message: string;
    }> {
        return api.post('/data-validation/run', request);
    },

    /**
     * Get validation summary
     */
    async getValidationSummary(): Promise<{
        success: boolean;
        summary: ValidationSummary;
        message: string;
    }> {
        return api.get('/data-validation/summary');
    },

    /**
     * Get health metrics
     */
    async getHealthMetrics(): Promise<{
        success: boolean;
        health: HealthMetrics;
        message: string;
    }> {
        return api.get('/data-validation/health');
    }
};