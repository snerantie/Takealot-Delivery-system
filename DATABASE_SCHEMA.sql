-- Takealot Driver Management Platform - PostgreSQL Database Schema
-- Version: 1.0
-- Date: 2026-06-04

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('driver', 'admin', 'super_admin');
CREATE TYPE vehicle_type AS ENUM ('car', 'bike', 'van');
CREATE TYPE driver_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE trip_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE payment_method AS ENUM ('prepaid', 'cod');
CREATE TYPE deposit_status AS ENUM ('pending', 'deposited', 'verified', 'disputed');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'failed');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'paid', 'failed');
CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE broadcast_audience AS ENUM ('all_drivers', 'active_drivers', 'specific_drivers', 'admins');
CREATE TYPE broadcast_status AS ENUM ('draft', 'scheduled', 'sent');

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    profile_picture_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    is_revoked BOOLEAN DEFAULT false
);

-- ============================================================================
-- DRIVERS
-- ============================================================================

CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    driver_code VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type vehicle_type NOT NULL,
    license_number VARCHAR(50),
    license_expiry DATE,
    vehicle_reg_number VARCHAR(20),
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_year INTEGER,
    bank_account_number VARCHAR(50),
    bank_account_holder VARCHAR(255),
    bank_name VARCHAR(100),
    branch_code VARCHAR(20),
    status driver_status DEFAULT 'active',
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_deliveries INTEGER DEFAULT 0,
    total_distance_km DECIMAL(10,2) DEFAULT 0.00,
    joined_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT rating_range CHECK (rating >= 0 AND rating <= 5)
);

CREATE TABLE driver_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    document_type VARCHAR(50), -- 'license', 'id', 'vehicle_registration', etc.
    document_url VARCHAR(500) NOT NULL,
    expiry_date DATE,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP
);

-- ============================================================================
-- TRIPS
-- ============================================================================

CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_number VARCHAR(50) UNIQUE NOT NULL,
    driver_id UUID REFERENCES drivers(id),
    assigned_by UUID REFERENCES users(id),
    status trip_status DEFAULT 'pending',
    
    -- Pickup details
    pickup_address VARCHAR(500) NOT NULL,
    pickup_lat DECIMAL(10, 8),
    pickup_lng DECIMAL(11, 8),
    pickup_contact_name VARCHAR(255),
    pickup_contact_phone VARCHAR(20),
    scheduled_pickup TIMESTAMP,
    actual_pickup TIMESTAMP,
    
    -- Delivery details
    delivery_address VARCHAR(500) NOT NULL,
    delivery_lat DECIMAL(10, 8),
    delivery_lng DECIMAL(11, 8),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    scheduled_delivery TIMESTAMP,
    actual_delivery TIMESTAMP,
    
    -- Trip metrics
    distance_km DECIMAL(10,2),
    estimated_duration INTEGER, -- minutes
    actual_duration INTEGER, -- minutes
    route_data JSONB, -- Google Maps route information
    
    -- Payment
    payment_method payment_method DEFAULT 'prepaid',
    cod_amount DECIMAL(10,2) DEFAULT 0.00,
    delivery_fee DECIMAL(10,2),
    
    -- Additional info
    priority INTEGER DEFAULT 0,
    special_instructions TEXT,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    
    CONSTRAINT valid_coordinates_pickup CHECK (
        (pickup_lat IS NULL AND pickup_lng IS NULL) OR 
        (pickup_lat BETWEEN -90 AND 90 AND pickup_lng BETWEEN -180 AND 180)
    ),
    CONSTRAINT valid_coordinates_delivery CHECK (
        (delivery_lat IS NULL AND delivery_lng IS NULL) OR 
        (delivery_lat BETWEEN -90 AND 90 AND delivery_lng BETWEEN -180 AND 180)
    )
);

CREATE TABLE trip_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    item_description VARCHAR(500) NOT NULL,
    item_quantity INTEGER DEFAULT 1,
    item_weight_kg DECIMAL(10,2),
    item_value DECIMAL(10,2),
    tracking_number VARCHAR(100),
    barcode VARCHAR(100),
    
    CONSTRAINT positive_quantity CHECK (item_quantity > 0)
);

CREATE TABLE trip_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PAYMENTS & COD TRACKING
-- ============================================================================

CREATE TABLE cod_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID UNIQUE REFERENCES trips(id),
    driver_id UUID REFERENCES drivers(id),
    
    -- Collection details
    amount_collected DECIMAL(10,2) NOT NULL,
    collection_time TIMESTAMP DEFAULT NOW(),
    collection_notes TEXT,
    
    -- Deposit details
    deposit_status deposit_status DEFAULT 'pending',
    atm_reference VARCHAR(100),
    atm_deposit_time TIMESTAMP,
    bank_name VARCHAR(100),
    atm_location VARCHAR(255),
    atm_receipt_url VARCHAR(500), -- uploaded receipt image
    
    -- Verification
    verification_status verification_status DEFAULT 'pending',
    verified_amount DECIMAL(10,2),
    verified_at TIMESTAMP,
    verified_by UUID REFERENCES users(id),
    verification_notes TEXT,
    
    -- Discrepancy handling
    discrepancy_amount DECIMAL(10,2) DEFAULT 0.00,
    discrepancy_reason TEXT,
    discrepancy_resolved BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT positive_amount CHECK (amount_collected > 0)
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    driver_id UUID REFERENCES drivers(id),
    
    -- Payment period
    payment_period_start DATE NOT NULL,
    payment_period_end DATE NOT NULL,
    
    -- Calculations
    total_deliveries INTEGER DEFAULT 0,
    total_cod_collected DECIMAL(10,2) DEFAULT 0.00,
    base_earnings DECIMAL(10,2) DEFAULT 0.00,
    distance_earnings DECIMAL(10,2) DEFAULT 0.00,
    cod_handling_fees DECIMAL(10,2) DEFAULT 0.00,
    bonuses DECIMAL(10,2) DEFAULT 0.00,
    total_earnings DECIMAL(10,2) NOT NULL,
    
    -- Deductions
    fuel_deductions DECIMAL(10,2) DEFAULT 0.00,
    damage_deductions DECIMAL(10,2) DEFAULT 0.00,
    other_deductions DECIMAL(10,2) DEFAULT 0.00,
    total_deductions DECIMAL(10,2) DEFAULT 0.00,
    
    net_payment DECIMAL(10,2) NOT NULL,
    
    -- Payment processing
    payment_status payment_status DEFAULT 'pending',
    payment_date DATE,
    payment_reference VARCHAR(100),
    payment_method VARCHAR(50), -- 'bank_transfer', 'eft', 'cash'
    payment_notes TEXT,
    
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_period CHECK (payment_period_end >= payment_period_start)
);

-- ============================================================================
-- EARNINGS
-- ============================================================================

CREATE TABLE earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id),
    trip_id UUID REFERENCES trips(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Breakdown
    base_fee DECIMAL(10,2) DEFAULT 0.00,
    distance_fee DECIMAL(10,2) DEFAULT 0.00,
    time_fee DECIMAL(10,2) DEFAULT 0.00,
    cod_handling_fee DECIMAL(10,2) DEFAULT 0.00,
    peak_hour_bonus DECIMAL(10,2) DEFAULT 0.00,
    performance_bonus DECIMAL(10,2) DEFAULT 0.00,
    
    total_earned DECIMAL(10,2) NOT NULL,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    type VARCHAR(50) NOT NULL, -- 'trip_assigned', 'payment_ready', 'cod_verified', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- additional payload for frontend
    action_url VARCHAR(500), -- deep link or URL
    
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    priority notification_priority DEFAULT 'medium',
    
    sent_via VARCHAR[] DEFAULT '{"in_app"}', -- ['in_app', 'push', 'sms', 'email']
    
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP -- optional expiry
);

CREATE TABLE broadcast_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID REFERENCES users(id),
    
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    target_audience broadcast_audience NOT NULL,
    target_driver_ids UUID[], -- specific drivers if applicable
    
    delivery_method VARCHAR[] NOT NULL DEFAULT '{"push"}', -- ['push', 'sms', 'email']
    
    sent_at TIMESTAMP,
    scheduled_for TIMESTAMP,
    status broadcast_status DEFAULT 'draft',
    
    total_recipients INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_read INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE broadcast_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broadcast_id UUID REFERENCES broadcast_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    
    UNIQUE(broadcast_id, user_id)
);

-- ============================================================================
-- DELIVERY PROOFS
-- ============================================================================

CREATE TABLE delivery_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
    
    signature_url VARCHAR(500),
    photo_urls VARCHAR[] DEFAULT '{}',
    
    customer_name VARCHAR(255),
    customer_signature_name VARCHAR(255), -- name as signed
    recipient_relationship VARCHAR(100), -- if delivered to someone else
    
    notes TEXT,
    
    -- Location verification
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(11, 8),
    gps_accuracy DECIMAL(10,2), -- meters
    
    captured_at TIMESTAMP DEFAULT NOW(),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ROUTES & OPTIMIZATION
-- ============================================================================

CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    waypoints JSONB NOT NULL, -- array of {address, lat, lng, order}
    optimized_order INTEGER[],
    
    total_distance_km DECIMAL(10,2),
    estimated_duration INTEGER, -- minutes
    
    is_active BOOLEAN DEFAULT true,
    is_template BOOLEAN DEFAULT false,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- AUDIT & LOGGING
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- 'trip', 'payment', 'user', etc.
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    data_type VARCHAR(20), -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Drivers
CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_code ON drivers(driver_code);

-- Trips
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_trip_number ON trips(trip_number);
CREATE INDEX idx_trips_scheduled_pickup ON trips(scheduled_pickup);
CREATE INDEX idx_trips_scheduled_delivery ON trips(scheduled_delivery);
CREATE INDEX idx_trips_created_at ON trips(created_at DESC);

-- COD Collections
CREATE INDEX idx_cod_collections_driver_id ON cod_collections(driver_id);
CREATE INDEX idx_cod_collections_deposit_status ON cod_collections(deposit_status);
CREATE INDEX idx_cod_collections_verification_status ON cod_collections(verification_status);
CREATE INDEX idx_cod_collections_collection_time ON cod_collections(collection_time DESC);

-- Payments
CREATE INDEX idx_payments_driver_id ON payments(driver_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_period ON payments(payment_period_start, payment_period_end);

-- Earnings
CREATE INDEX idx_earnings_driver_id ON earnings(driver_id);
CREATE INDEX idx_earnings_date ON earnings(date DESC);
CREATE INDEX idx_earnings_trip_id ON earnings(trip_id);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Audit Logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cod_collections_updated_at BEFORE UPDATE ON cod_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active drivers with user details
CREATE VIEW v_active_drivers AS
SELECT 
    d.*,
    u.email,
    u.first_name,
    u.last_name,
    u.phone_number,
    u.profile_picture_url
FROM drivers d
JOIN users u ON d.user_id = u.id
WHERE d.status = 'active' AND u.is_active = true;

-- Trips with driver and earnings
CREATE VIEW v_trip_details AS
SELECT 
    t.*,
    d.driver_code,
    u.first_name as driver_first_name,
    u.last_name as driver_last_name,
    u.phone_number as driver_phone,
    e.total_earned,
    c.amount_collected as cod_amount_collected,
    c.deposit_status as cod_deposit_status
FROM trips t
LEFT JOIN drivers d ON t.driver_id = d.id
LEFT JOIN users u ON d.user_id = u.id
LEFT JOIN earnings e ON t.id = e.trip_id
LEFT JOIN cod_collections c ON t.id = c.trip_id;

-- Driver earnings summary
CREATE VIEW v_driver_earnings_summary AS
SELECT 
    d.id as driver_id,
    d.driver_code,
    u.first_name,
    u.last_name,
    COUNT(DISTINCT e.trip_id) as total_trips,
    SUM(e.total_earned) as total_earnings,
    AVG(e.total_earned) as avg_earning_per_trip,
    MAX(e.date) as last_trip_date
FROM drivers d
JOIN users u ON d.user_id = u.id
LEFT JOIN earnings e ON d.id = e.driver_id
GROUP BY d.id, d.driver_code, u.first_name, u.last_name;

-- ============================================================================
-- SEED DATA (Optional - for development)
-- ============================================================================

-- Insert default system settings
INSERT INTO system_settings (key, value, data_type, description) VALUES
('base_delivery_fee', '50.00', 'number', 'Base fee per delivery in ZAR'),
('per_km_rate', '8.50', 'number', 'Rate per kilometer in ZAR'),
('cod_handling_fee_percent', '2.5', 'number', 'COD handling fee percentage'),
('payment_cycle_days', '7', 'number', 'Payment cycle in days (7 = weekly, 30 = monthly)'),
('max_daily_trips', '20', 'number', 'Maximum trips per driver per day'),
('notification_retention_days', '30', 'number', 'Days to keep notifications'),
('require_signature', 'true', 'boolean', 'Require customer signature for delivery'),
('require_photo', 'false', 'boolean', 'Require photo proof for delivery');
