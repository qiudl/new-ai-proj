\set v_password :ENV.COMPANY_ADMIN_PASSWORD
\set v_username 'songjx'
\set v_email 'songjx@joylodging.com'
\set v_name '北京欢乐宿公司'

-- Ensure required extension and tables exist (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- minimal users table for our purposes (idempotent)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  user_type VARCHAR(20) DEFAULT 'system',
  company_id INTEGER,
  company_user_id INTEGER,
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(20) DEFAULT 'active',
  profile JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  contact_person_name VARCHAR(100),
  contact_phone VARCHAR(50),
  department_title VARCHAR(100),
  is_primary_contact BOOLEAN DEFAULT FALSE,
  account_expires_at TIMESTAMPTZ,
  last_project_access TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'users_email_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX users_email_unique_idx ON users(lower(email)) WHERE email IS NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  company_code VARCHAR(100),
  industry VARCHAR(100),
  company_type VARCHAR(100),
  business_license VARCHAR(100),
  tax_number VARCHAR(100),
  legal_representative VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  website VARCHAR(255),
  main_phone VARCHAR(50),
  main_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  priority VARCHAR(20) DEFAULT 'medium',
  annual_contract_value DECIMAL(15,2) DEFAULT 0,
  total_contract_value DECIMAL(15,2) DEFAULT 0,
  start_date DATE,
  employee_count INTEGER,
  company_size VARCHAR(50),
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

BEGIN;

-- Ensure company exists (idempotent)
INSERT INTO customers (
  company_name, company_code, industry, company_type, address,
  main_email, status, priority, company_size, created_at, updated_at
)
SELECT :'v_name', 'JOYLODGE-BJ-001', 'hospitality', 'limited_company', '北京',
       'info@joylodging.com', 'active', 'medium', 'medium', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM customers WHERE company_name = :'v_name'
);

-- Upsert user by username
INSERT INTO users (
  username, email, password_hash, user_type, company_id, role, status,
  contact_person_name, contact_phone, department_title, is_primary_contact,
  created_at, updated_at, notes
)
SELECT 
  :'v_username',
  :'v_email',
  crypt(:'v_password', gen_salt('bf', 12)),
  'company',
  (SELECT id FROM customers WHERE company_name = :'v_name' ORDER BY id DESC LIMIT 1),
  'company_admin',
  'active',
  '宋建新',
  '13800000000',
  '技术部',
  false,
  NOW(),
  NOW(),
  '北京欢乐宿公司技术负责人'
ON CONFLICT (username)
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  user_type = 'company',
  company_id = EXCLUDED.company_id,
  role = 'company_admin',
  status = 'active',
  contact_person_name = COALESCE(users.contact_person_name, EXCLUDED.contact_person_name),
  contact_phone = COALESCE(users.contact_phone, EXCLUDED.contact_phone),
  department_title = COALESCE(users.department_title, EXCLUDED.department_title),
  updated_at = NOW();

COMMIT;
