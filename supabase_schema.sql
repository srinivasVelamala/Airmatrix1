-- 1. Create Enums for type safety
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('customer', 'admin', 'employee');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE ticket_status AS ENUM ('New', 'Assigned', 'Accepted', 'On Route', 'Arrived', 'In Progress', 'Parts Required', 'Waiting Customer Approval', 'Completed', 'Cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
        CREATE TYPE ticket_priority AS ENUM ('Low', 'Medium', 'High', 'Emergency');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ac_type') THEN
        CREATE TYPE ac_type AS ENUM ('Split AC', 'Window AC', 'Cassette AC', 'Central AC');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
        CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'disabled');
    END IF;
END $$;

-- 2. Users Table (Independent of Auth)
CREATE TABLE IF NOT EXISTS users (
  id uuid default gen_random_uuid() primary key,
  role user_role default 'customer',
  name text not null,
  mobile_no text unique not null,
  password_hash text not null,
  approval_status approval_status default 'pending',
  active boolean default false,
  created_at timestamptz default now()
);

-- Ensure is_admin exists if the table was created in a previous version
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'is_admin') THEN
        ALTER TABLE users ADD COLUMN is_admin boolean default false;
    END IF;
END $$;

-- 3. Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid not null,
  status ticket_status default 'New',
  priority ticket_priority default 'Medium',
  address text not null,
  latitude float,
  longitude float,
  ac_type ac_type default 'Split AC',
  brand text,
  complaint text,
  assigned_employee uuid,
  preferred_visit_date timestamptz,
  created_at timestamptz default now()
);

-- Ensure foreign keys point to the correct table (users)
DO $$ 
BEGIN 
    -- Drop constraints if they exist on the 'tickets' table specifically
    -- We use a more generic approach to find and drop any FK on tickets.customer_id
    -- to squash any hidden constraints from previous versions/templates
    
    -- 1. Drop existing constraints if they exist
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_customer_id_fkey') THEN
        ALTER TABLE tickets DROP CONSTRAINT tickets_customer_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_assigned_employee_fkey') THEN
        ALTER TABLE tickets DROP CONSTRAINT tickets_assigned_employee_fkey;
    END IF;

    -- 2. Add them back accurately pointing to the 'users' table
    ALTER TABLE tickets ADD CONSTRAINT tickets_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE;
        
    ALTER TABLE tickets ADD CONSTRAINT tickets_assigned_employee_fkey 
        FOREIGN KEY (assigned_employee) REFERENCES users(id) ON DELETE SET NULL;
END $$;

-- 4. Status History (Audit Log)
CREATE TABLE IF NOT EXISTS ticket_status_history (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references tickets(id) on delete cascade,
  old_status ticket_status,
  new_status ticket_status,
  changed_by uuid references users(id),
  notes text,
  timestamp timestamptz default now()
);

-- 5. Employee Locations (Realtime Tracking)
CREATE TABLE IF NOT EXISTS employee_locations (
  employee_id uuid references users(id) primary key,
  latitude float not null,
  longitude float not null,
  updated_at timestamptz default now()
);

-- 6. Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references tickets(id) on delete cascade,
  image_url text not null,
  created_at timestamptz default now()
);

-- 7. Configure RLS (Enabled with Public Access since we are bypassing Supabase Auth)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all access for now (for the custom auth flow)
DROP POLICY IF EXISTS "Public access" ON users;
CREATE POLICY "Public access" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON tickets;
CREATE POLICY "Public access" ON tickets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON ticket_status_history;
CREATE POLICY "Public access" ON ticket_status_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON employee_locations;
CREATE POLICY "Public access" ON employee_locations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON attachments;
CREATE POLICY "Public access" ON attachments FOR ALL USING (true) WITH CHECK (true);

-- 8. Enable REALTIME
DO $$
BEGIN
    -- Only add tables to publication if they aren't already members
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'tickets'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'users'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE users;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'employee_locations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE employee_locations;
    END IF;
END $$;
