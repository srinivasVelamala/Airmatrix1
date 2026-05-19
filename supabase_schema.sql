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

-- 2. Split User Tables (Independent of Auth)
CREATE TABLE IF NOT EXISTS customers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  mobile_no text unique not null,
  password_hash text not null,
  approval_status approval_status default 'pending',
  active boolean default false,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS employees (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  mobile_no text unique not null,
  password_hash text not null,
  approval_status approval_status default 'pending',
  is_admin boolean default false,
  active boolean default false,
  created_at timestamptz default now()
);

-- DATA MIGRATION LOGIC
-- This block moves data from the old 'users' table if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'users' AND TABLE_SCHEMA = 'public') THEN
        -- Move Customers using Dynamic SQL to avoid parse-time errors if 'users' doesn't exist
        EXECUTE '
            INSERT INTO customers (id, name, mobile_no, password_hash, approval_status, active, created_at)
            SELECT id, name, mobile_no, password_hash, approval_status, active, created_at
            FROM users 
            WHERE role = ''customer''
            ON CONFLICT (mobile_no) DO NOTHING;
        ';

        -- Move Employees/Admins using Dynamic SQL
        EXECUTE '
            INSERT INTO employees (id, name, mobile_no, password_hash, approval_status, is_admin, active, created_at)
            SELECT id, name, mobile_no, password_hash, approval_status, COALESCE(is_admin, false), active, created_at
            FROM users 
            WHERE role IN (''employee'', ''admin'')
            ON CONFLICT (mobile_no) DO NOTHING;
        ';

        -- Rename the old table as a backup instead of dropping it
        EXECUTE 'ALTER TABLE users RENAME TO users_old_backup';
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

-- Ensure foreign keys point to the correct tables
DO $$ 
BEGIN 
    -- 1. Drop existing constraints
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_customer_id_fkey') THEN
        ALTER TABLE tickets DROP CONSTRAINT tickets_customer_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_assigned_employee_fkey') THEN
        ALTER TABLE tickets DROP CONSTRAINT tickets_assigned_employee_fkey;
    END IF;

    -- 2. Add them back pointing to the split tables
    ALTER TABLE tickets ADD CONSTRAINT tickets_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
        
    ALTER TABLE tickets ADD CONSTRAINT tickets_assigned_employee_fkey 
        FOREIGN KEY (assigned_employee) REFERENCES employees(id) ON DELETE SET NULL;
END $$;

-- 4. Status History (Audit Log)
CREATE TABLE IF NOT EXISTS ticket_status_history (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references tickets(id) on delete cascade,
  old_status ticket_status,
  new_status ticket_status,
  changed_by_id uuid, -- Reference either customer or employee (soft FK)
  notes text,
  timestamp timestamptz default now()
);

-- 5. Employee Locations (Realtime Tracking)
CREATE TABLE IF NOT EXISTS employee_locations (
  employee_id uuid references employees(id) primary key,
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

-- 6.1 Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  title text not null,
  message text not null,
  type text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- 6.2 Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete cascade,
  item_name text not null,
  item_category text,
  amount decimal(10,2) not null,
  currency text default 'INR',
  status text default 'completed', -- completed, pending, cancelled
  payment_method text,
  transaction_id text,
  created_at timestamptz default now()
);

-- 6.3 Products Table (Store)
CREATE TABLE IF NOT EXISTS products (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  description text,
  price decimal(10,2) not null,
  category text,
  image_url text,
  stock_quantity integer default 0,
  created_at timestamptz default now()
);

-- 6.4 Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete cascade,
  total_amount decimal(10,2) not null,
  status text default 'pending', -- pending, processing, shipped, delivered, cancelled
  created_at timestamptz default now()
);

-- 6.5 Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  quantity integer not null,
  unit_price decimal(10,2) not null,
  created_at timestamptz default now()
);

-- Seed Products
INSERT INTO products (name, description, price, category, image_url, stock_quantity)
VALUES 
('Eco-Cooler Split AC 1.5T', '5-star energy efficient split AC with copper condenser and anti-bacterial filter.', 34999, 'Units', 'https://images.unsplash.com/photo-1631522036496-c14777d9c0cb?auto=format&fit=crop&q=80&w=800', 12),
('Universal AC Remote Control', 'Backlit LCD display, compatible with 1000+ brands. Easy setup.', 850, 'Accessories', 'https://images.unsplash.com/photo-1591123720164-de1348028a82?auto=format&fit=crop&q=80&w=800', 85),
('Premium HEPA Air Filter', 'Washable high-density air filter for split ACs. Traps 99% of dust.', 1200, 'Filters', 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=800', 40),
('36 MFD Run Capacitor', 'Heavy-duty dual run capacitor for outdoor unit compressor.', 450, 'Spare Parts', 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=800', 25),
('Outdoor Unit Stand (Heavy Duty)', 'Anti-corrosive powder coated steel stand for AC outdoor units.', 1500, 'Accessories', 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&q=80&w=800', 15),
('Copper Pipe Kit (3 Meters)', 'Insulated copper pipe for split AC installation. 1/2 and 1/4 inch.', 2800, 'Spare Parts', 'https://images.unsplash.com/photo-1581094288338-2314dddb793?auto=format&fit=crop&q=80&w=800', 10),
('Smart AC Controller Hub', 'WiFi enabled smart hub to control your AC from anywhere using your smartphone.', 2450, 'Accessories', 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&q=80&w=800', 30),
('Anti-Vibration Mounting Pads', 'Set of 4 heavy-duty rubber pads to reduce noise and vibration of outdoor units.', 650, 'Spare Parts', 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&q=80&w=800', 50)
ON CONFLICT DO NOTHING;

-- 7. Configure RLS (Enabled with Public Access)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Public access" ON customers;
CREATE POLICY "Public access" ON customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON employees;
CREATE POLICY "Public access" ON employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON tickets;
CREATE POLICY "Public access" ON tickets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON ticket_status_history;
CREATE POLICY "Public access" ON ticket_status_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON employee_locations;
CREATE POLICY "Public access" ON employee_locations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON attachments;
CREATE POLICY "Public access" ON attachments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON notifications;
CREATE POLICY "Public access" ON notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON purchases;
CREATE POLICY "Public access" ON purchases FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON products;
CREATE POLICY "Public access" ON products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON orders;
CREATE POLICY "Public access" ON orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON order_items;
CREATE POLICY "Public access" ON order_items FOR ALL USING (true) WITH CHECK (true);

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
        WHERE pubname = 'supabase_realtime' AND tablename = 'customers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE customers;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'employees'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE employees;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'employee_locations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE employee_locations;
    END IF;
END $$;
