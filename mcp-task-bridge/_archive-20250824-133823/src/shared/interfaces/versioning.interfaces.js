/**
 * Task Description Versioning Interfaces
 * 任务描述版本化接口契约
 *
 * 此文件定义了所有团队成员必须遵循的接口契约
 * 确保并行开发时的一致性
 */
// ============= 错误定义 =============
export class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
    }
}
export class ForbiddenError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ForbiddenError';
    }
}
export class DatabaseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DatabaseError';
    }
}
