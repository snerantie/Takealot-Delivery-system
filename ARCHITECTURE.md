# Takealot Driver Management Platform - System Architecture

## Overview
A comprehensive delivery management system for Takealot drivers with trip tracking, COD payment verification, real-time notifications, and admin oversight.

## Technology Stack

### Frontend (Web)
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit / Zustand
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Maps Integration**: Google Maps API / Mapbox
- **Real-time**: Socket.io client
- **Form Validation**: React Hook Form + Zod
- **API Client**: Axios / React Query

### Backend
- **Runtime**: Node.js 20+ with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 15+ (primary)
- **Cache**: Redis (sessions, real-time data)
- **ORM**: Prisma
- **Authentication**: JWT + Refresh Tokens
- **Real-time**: Socket.io
- **File Storage**: AWS S3 / Cloudinary (for proof of delivery images)
- **Queue System**: Bull (for background jobs, notifications)

### Mobile App
- **Framework**: React Native with TypeScript
- **Navigation**: React Navigation
- **State**: Redux Toolkit
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Maps**: React Native Maps
- **Camera**: React Native Camera / Image Picker

### External Integrations
- **Banking API**: Integration with South African banks (e.g., Nedbank, FNB APIs)
- **SMS Gateway**: Twilio / Africa's Talking
- **Email**: SendGrid / AWS SES
- **Push Notifications**: Firebase Cloud Messaging
- **Payment Verification**: Bank statement parsing or ATM API integration

### DevOps & Infrastructure
- **Hosting**: AWS / DigitalOcean / Vercel (frontend) + Railway/Render (backend)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (error tracking), DataDog/New Relic
- **Analytics**: Google Analytics, Mixpanel

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├──────────────────────────┬──────────────────────────────────────┤
│   Web App (React)        │   Mobile App (React Native)          │
│   - Driver Dashboard     │   - Driver Interface                 │
│   - Admin Panel          │   - Real-time Updates                │
│   - Analytics            │   - Offline Support                  │
└──────────────┬───────────┴──────────────────┬───────────────────┘
               │                              │
               └──────────────┬───────────────┘
                              │ HTTPS/WSS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY / LOAD BALANCER                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Express.js API Server (Node.js + TypeScript)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  RESTful API Endpoints                                    │  │
│  │  - /auth     - /trips      - /payments                    │  │
│  │  - /users    - /notifications - /admin                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WebSocket Server (Socket.io)                            │  │
│  │  - Real-time trip updates                                │  │
│  │  - Live notifications                                     │  │
│  │  - Broadcast messages                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────┬────────────────────────┬────────────────────┬──────────┘
        │                        │                    │
        ▼                        ▼                    ▼
┌──────────────┐      ┌──────────────────┐   ┌─────────────────┐
│   Redis      │      │  Background Jobs │   │  File Storage   │
│   Cache      │      │  (Bull Queue)    │   │  (AWS S3)       │
│              │      │                  │   │                 │
│ - Sessions   │      │ - Email/SMS      │   │ - Signatures    │
│ - Real-time  │      │ - Notifications  │   │ - Photos        │
│ - Rate Limit │      │ - Reports        │   │ - Documents     │
└──────────────┘      └──────────────────┘   └─────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Tables:                                                  │  │
│  │  - users, drivers, admins                                │  │
│  │  - trips, trip_items, trip_status_history               │  │
│  │  - payments, cod_collections, atm_deposits               │  │
│  │  - notifications, broadcast_messages                     │  │
│  │  - earnings, delivery_proofs, routes                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
├──────────────────┬──────────────────┬──────────────────────────┤
│  Banking APIs    │  SMS Gateway     │  Push Notifications      │
│  - ATM Deposits  │  (Twilio)        │  (Firebase FCM)          │
│  - Verification  │  - Broadcasts    │  - Trip Updates          │
│  - Statement API │  - Alerts        │  - Payment Alerts        │
└──────────────────┴──────────────────┴──────────────────────────┘
```

## Database Schema

### Core Tables

#### 1. **users**
```sql
id                  UUID PRIMARY KEY
email               VARCHAR(255) UNIQUE NOT NULL
password_hash       VARCHAR(255) NOT NULL
role                ENUM('driver', 'admin', 'super_admin')
first_name          VARCHAR(100)
last_name           VARCHAR(100)
phone_number        VARCHAR(20)
profile_picture_url VARCHAR(500)
is_active           BOOLEAN DEFAULT true
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()
last_login          TIMESTAMP
```

#### 2. **drivers**
```sql
id                  UUID PRIMARY KEY
user_id             UUID REFERENCES users(id) ON DELETE CASCADE
driver_code         VARCHAR(50) UNIQUE NOT NULL
vehicle_type        ENUM('car', 'bike', 'van')
license_number      VARCHAR(50)
vehicle_reg_number  VARCHAR(20)
bank_account_number VARCHAR(50)
bank_name           VARCHAR(100)
branch_code         VARCHAR(20)
status              ENUM('active', 'inactive', 'suspended') DEFAULT 'active'
rating              DECIMAL(3,2) DEFAULT 0.00
total_deliveries    INTEGER DEFAULT 0
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()
```

#### 3. **trips**
```sql
id                  UUID PRIMARY KEY
trip_number         VARCHAR(50) UNIQUE NOT NULL
driver_id           UUID REFERENCES drivers(id)
assigned_by         UUID REFERENCES users(id)
status              ENUM('pending', 'assigned', 'in_progress', 'completed', 'cancelled')
pickup_location     JSONB NOT NULL -- {address, lat, lng}
delivery_location   JSONB NOT NULL -- {address, lat, lng, customer_name, phone}
scheduled_pickup    TIMESTAMP
actual_pickup       TIMESTAMP
scheduled_delivery  TIMESTAMP
actual_delivery     TIMESTAMP
distance_km         DECIMAL(10,2)
estimated_duration  INTEGER -- minutes
route_data          JSONB -- optimized route information
payment_method      ENUM('prepaid', 'cod')
cod_amount          DECIMAL(10,2)
delivery_fee        DECIMAL(10,2)
notes               TEXT
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()
```

#### 4. **trip_items**
```sql
id                  UUID PRIMARY KEY
trip_id             UUID REFERENCES trips(id) ON DELETE CASCADE
item_description    VARCHAR(500)
item_quantity       INTEGER DEFAULT 1
item_value          DECIMAL(10,2)
tracking_number     VARCHAR(100)
```

#### 5. **trip_status_history**
```sql
id                  UUID PRIMARY KEY
trip_id             UUID REFERENCES trips(id) ON DELETE CASCADE
status              VARCHAR(50)
notes               TEXT
location            JSONB -- {lat, lng}
changed_by          UUID REFERENCES users(id)
created_at          TIMESTAMP DEFAULT NOW()
```

#### 6. **cod_collections**
```sql
id                  UUID PRIMARY KEY
trip_id             UUID REFERENCES trips(id)
driver_id           UUID REFERENCES drivers(id)
amount_collected    DECIMAL(10,2) NOT NULL
collection_time     TIMESTAMP DEFAULT NOW()
deposit_status      ENUM('pending', 'deposited', 'verified', 'disputed') DEFAULT 'pending'
atm_reference       VARCHAR(100)
atm_deposit_time    TIMESTAMP
bank_name           VARCHAR(100)
atm_location        VARCHAR(255)
verification_status ENUM('pending', 'verified', 'failed') DEFAULT 'pending'
verified_at         TIMESTAMP
verified_by         UUID REFERENCES users(id)
discrepancy_amount  DECIMAL(10,2) DEFAULT 0.00
notes               TEXT
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()
```

#### 7. **payments**
```sql
id                  UUID PRIMARY KEY
driver_id           UUID REFERENCES drivers(id)
payment_period_start DATE
payment_period_end  DATE
total_deliveries    INTEGER
total_cod_collected DECIMAL(10,2)
total_earnings      DECIMAL(10,2)
deductions          DECIMAL(10,2) DEFAULT 0.00
net_payment         DECIMAL(10,2)
payment_status      ENUM('pending', 'processing', 'paid', 'failed')
payment_date        DATE
payment_reference   VARCHAR(100)
payment_method      VARCHAR(50) -- 'bank_transfer', 'eft', etc.
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()
```

#### 8. **notifications**
```sql
id                  UUID PRIMARY KEY
user_id             UUID REFERENCES users(id) ON DELETE CASCADE
type                VARCHAR(50) -- 'trip_assigned', 'payment_ready', 'broadcast', etc.
title               VARCHAR(255)
message             TEXT
data                JSONB -- additional payload
is_read             BOOLEAN DEFAULT false
read_at             TIMESTAMP
priority            ENUM('low', 'medium', 'high') DEFAULT 'medium'
created_at          TIMESTAMP DEFAULT NOW()
```

#### 9. **broadcast_messages**
```sql
id                  UUID PRIMARY KEY
created_by          UUID REFERENCES users(id)
title               VARCHAR(255)
message             TEXT
target_audience     ENUM('all_drivers', 'active_drivers', 'specific_drivers', 'admins')
target_driver_ids   UUID[] -- specific drivers if applicable
sent_at             TIMESTAMP DEFAULT NOW()
scheduled_for       TIMESTAMP
delivery_method     VARCHAR[] -- ['push', 'sms', 'email']
status              ENUM('draft', 'scheduled', 'sent') DEFAULT 'sent'
total_recipients    INTEGER
```

#### 10. **delivery_proofs**
```sql
id                  UUID PRIMARY KEY
trip_id             UUID REFERENCES trips(id) ON DELETE CASCADE
signature_url       VARCHAR(500)
photo_urls          VARCHAR[] -- array of image URLs
customer_name       VARCHAR(255)
notes               TEXT
gps_location        JSONB -- {lat, lng}
captured_at         TIMESTAMP DEFAULT NOW()
```

#### 11. **earnings**
```sql
id                  UUID PRIMARY KEY
driver_id           UUID REFERENCES drivers(id)
trip_id             UUID REFERENCES trips(id)
date                DATE
base_fee            DECIMAL(10,2)
distance_fee        DECIMAL(10,2)
cod_handling_fee    DECIMAL(10,2)
bonus               DECIMAL(10,2) DEFAULT 0.00
total_earned        DECIMAL(10,2)
created_at          TIMESTAMP DEFAULT NOW()
```

#### 12. **routes**
```sql
id                  UUID PRIMARY KEY
name                VARCHAR(255)
description         TEXT
waypoints           JSONB[] -- array of {address, lat, lng}
total_distance_km   DECIMAL(10,2)
estimated_duration  INTEGER -- minutes
is_active           BOOLEAN DEFAULT true
created_by          UUID REFERENCES users(id)
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()
```

## API Endpoints Structure

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password

### Users & Drivers
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update profile
- `GET /api/drivers` - List all drivers (admin)
- `GET /api/drivers/:id` - Get driver details
- `PUT /api/drivers/:id` - Update driver
- `POST /api/drivers/:id/suspend` - Suspend driver
- `POST /api/drivers/:id/activate` - Activate driver

### Trips
- `GET /api/trips` - List trips (filtered by role)
- `GET /api/trips/:id` - Get trip details
- `POST /api/trips` - Create new trip (admin)
- `PUT /api/trips/:id` - Update trip
- `PUT /api/trips/:id/assign` - Assign trip to driver
- `PUT /api/trips/:id/status` - Update trip status
- `POST /api/trips/:id/pickup` - Mark pickup complete
- `POST /api/trips/:id/deliver` - Mark delivery complete
- `GET /api/trips/:id/history` - Get status history
- `GET /api/trips/driver/:driverId` - Get driver's trips

### Payments & COD
- `GET /api/payments` - List payments
- `GET /api/payments/driver/:driverId` - Get driver payments
- `POST /api/cod-collections` - Record COD collection
- `PUT /api/cod-collections/:id/deposit` - Record ATM deposit
- `POST /api/cod-collections/:id/verify` - Verify deposit (admin)
- `GET /api/cod-collections/pending` - Get unverified deposits

### Earnings
- `GET /api/earnings/driver/:driverId` - Get driver earnings
- `GET /api/earnings/summary` - Earnings summary (date range)
- `GET /api/earnings/dashboard` - Earnings dashboard data

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Broadcast Messages
- `POST /api/broadcasts` - Send broadcast message (admin)
- `GET /api/broadcasts` - List broadcasts (admin)
- `GET /api/broadcasts/:id` - Get broadcast details

### Delivery Proofs
- `POST /api/delivery-proofs` - Upload delivery proof
- `GET /api/delivery-proofs/trip/:tripId` - Get trip proof

### Admin & Analytics
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/analytics` - Analytics data
- `GET /api/admin/reports` - Generate reports

## Key Features Implementation

### 1. Real-time Updates (Socket.io)
- Trip assignment notifications
- Status updates
- Location tracking
- Live chat/support

### 2. Route Optimization
- Google Maps Directions API
- Multiple waypoint optimization
- Traffic-aware routing
- ETA calculations

### 3. ATM Integration Flow
1. Driver collects COD cash
2. Driver goes to ATM and deposits
3. Driver enters ATM reference number in app
4. System calls bank API to verify deposit
5. System matches amount, date, reference
6. Automated verification or admin approval

### 4. Notification System
- Push notifications (FCM)
- SMS (Twilio)
- Email (SendGrid)
- In-app notifications
- Broadcast messages

### 5. Payment Schedule
- Weekly/monthly payment cycles
- Automated payment calculations
- Deductions handling
- Payment history

## Security Considerations

- JWT authentication with refresh tokens
- Role-based access control (RBAC)
- API rate limiting
- Input validation and sanitization
- SQL injection prevention (Prisma)
- XSS protection
- HTTPS only
- Secure file uploads
- Environment variable management
- Audit logging

## Scalability Considerations

- Horizontal scaling with load balancers
- Database indexing on frequently queried fields
- Redis caching for sessions and real-time data
- CDN for static assets
- Background job processing with queues
- Database read replicas for analytics
- Microservices architecture (future)

## Development Phases

**Phase 1: MVP (Weeks 1-4)**
- Basic authentication
- Trip creation and assignment
- Simple COD tracking
- Basic notifications

**Phase 2: Core Features (Weeks 5-8)**
- Route optimization
- Earnings dashboard
- Delivery proofs
- Admin panel

**Phase 3: Advanced Features (Weeks 9-12)**
- ATM integration
- Broadcast messaging
- Analytics and reporting
- Mobile app development

**Phase 4: Polish & Launch (Weeks 13-16)**
- Testing and QA
- Performance optimization
- Deployment
- User training
