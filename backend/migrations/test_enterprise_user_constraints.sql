-- 企业用户数据库约束验证测试脚本
-- Date: 2025-08-26
-- Task: #524 - 验证调整后的企业用户数据库约束

BEGIN;

-- 清理测试数据
DELETE FROM users WHERE username LIKE 'test_%';

-- 测试 1：创建有效的系统用户（应该成功）
INSERT INTO users (username, email, password_hash, user_type, role, status) 
VALUES ('test_system_user', 'system@test.com', 'hashed_password', 'system', 'admin', 'active');
SELECT 'Test 1 PASSED: Valid system user created' AS result;

-- 测试 2：尝试创建系统用户但带有company_id（应该失败）
DO $$
BEGIN
    INSERT INTO users (username, email, password_hash, user_type, role, status, company_id) 
    VALUES ('test_invalid_system', 'invalid@test.com', 'hashed_password', 'system', 'admin', 'active', 1);
    RAISE EXCEPTION 'Test 2 FAILED: Should not allow system user with company_id';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Test 2 PASSED: System user with company_id correctly rejected';
END $$;

-- 测试 3：尝试创建企业用户但没有company_id（应该失败）
DO $$
BEGIN
    INSERT INTO users (username, email, password_hash, user_type, role, status) 
    VALUES ('test_invalid_company', 'invalid_company@test.com', 'hashed_password', 'company', 'company_admin', 'active');
    RAISE EXCEPTION 'Test 3 FAILED: Should not allow company user without company_id';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Test 3 PASSED: Company user without company_id correctly rejected';
END $$;

-- 测试 4：尝试创建企业用户但角色不对（应该失败）
DO $$
BEGIN
    INSERT INTO users (username, email, password_hash, user_type, role, status, company_id) 
    VALUES ('test_invalid_role', 'invalid_role@test.com', 'hashed_password', 'company', 'admin', 'active', 1);
    RAISE EXCEPTION 'Test 4 FAILED: Should not allow company user with system role';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Test 4 PASSED: Company user with invalid role correctly rejected';
END $$;

-- 测试 5：创建企业用户但缺少必填字段（应该失败）
DO $$
BEGIN
    INSERT INTO users (username, email, password_hash, user_type, role, status, company_id) 
    VALUES ('test_missing_fields', 'missing@test.com', 'hashed_password', 'company', 'company_admin', 'active', 1);
    RAISE EXCEPTION 'Test 5 FAILED: Should not allow company user without required fields';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Test 5 PASSED: Company user without required fields correctly rejected';
END $$;

-- 测试 6：创建有效的企业用户（应该成功）
INSERT INTO users (
    username, email, password_hash, user_type, role, status, company_id,
    contact_person_name, contact_phone, department_title, is_primary_contact
) VALUES (
    'test_company_admin', 'company_admin@test.com', 'hashed_password', 
    'company', 'company_admin', 'active', 1,
    'John Doe', '13800138000', 'IT Manager', true
);
SELECT 'Test 6 PASSED: Valid company user created' AS result;

-- 测试 7：尝试创建第二个主联系人（应该失败）
DO $$
BEGIN
    INSERT INTO users (
        username, email, password_hash, user_type, role, status, company_id,
        contact_person_name, contact_phone, department_title, is_primary_contact
    ) VALUES (
        'test_second_primary', 'second_primary@test.com', 'hashed_password', 
        'company', 'company_admin', 'active', 1,
        'Jane Smith', '13900139000', 'CEO', true
    );
    RAISE EXCEPTION 'Test 7 FAILED: Should not allow multiple primary contacts for same company';
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Test 7 PASSED: Multiple primary contacts for same company correctly rejected';
END $$;

-- 测试 8：创建同一公司的非主联系人用户（应该成功）
INSERT INTO users (
    username, email, password_hash, user_type, role, status, company_id,
    contact_person_name, contact_phone, department_title, is_primary_contact
) VALUES (
    'test_company_user', 'company_user@test.com', 'hashed_password', 
    'company', 'company_user', 'active', 1,
    'Bob Wilson', '13700137000', 'Developer', false
);
SELECT 'Test 8 PASSED: Valid secondary company user created' AS result;

-- 清理测试数据
DELETE FROM users WHERE username LIKE 'test_%';

SELECT 'All constraint tests completed successfully!' AS final_result;

ROLLBACK;