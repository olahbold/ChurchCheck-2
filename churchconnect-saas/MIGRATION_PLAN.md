# ChurchConnect SaaS Migration Plan

## Phase 1: Database Schema Updates (Week 1-2)

### New Tables to Add
```sql
-- Churches table for multi-tenant support
churches (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  subdomain VARCHAR UNIQUE,
  logo_url VARCHAR,
  brand_color VARCHAR,
  subscription_tier VARCHAR NOT NULL DEFAULT 'trial',
  trial_start_date TIMESTAMP,
  trial_end_date TIMESTAMP,
  subscription_start_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Church admins/users
church_users (
  id UUID PRIMARY KEY,
  church_id UUID REFERENCES churches(id),
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'admin',
  first_name VARCHAR,
  last_name VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subscription tracking
subscriptions (
  id UUID PRIMARY KEY,
  church_id UUID REFERENCES churches(id),
  stripe_subscription_id VARCHAR UNIQUE,
  status VARCHAR NOT NULL,
  plan_id VARCHAR NOT NULL,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Schema Modifications
- Add `church_id UUID REFERENCES churches(id)` to ALL existing tables:
  - members
  - attendance_records
  - follow_up_records
  - admin_users
  - visitors
  - report_configs
  - report_runs

## Phase 2: Authentication & Church Management (Week 3)

### Church Registration Flow
1. Landing page with "Start Free Trial" button
2. Church setup form (name, admin details)
3. Automatic 30-day trial activation
4. Church dashboard access

### Authentication System
- JWT-based authentication with church context
- Church-specific session management
- Role-based access control within churches

## Phase 3: Feature Gating & Subscription Logic (Week 4-5)

### Subscription Tiers Implementation
- Feature flag system based on church subscription
- Usage monitoring (member counts, API calls)
- Graceful feature degradation after trial

### Billing Integration
- Stripe subscription management
- Webhook handling for subscription events
- Invoice generation and payment processing

## Phase 4: UI/UX Updates (Week 6)

### Church Branding
- Dynamic logo and color theming
- Church name in header
- Customizable dashboard layout

### Admin Interface
- Subscription management panel
- Usage analytics dashboard
- Billing history and invoices

## Phase 5: Testing & Deployment (Week 7-8)

### Testing Strategy
- Multi-tenant data isolation testing
- Subscription flow testing
- Performance testing with multiple churches
- Security audit for tenant separation

### Deployment
- Production environment setup
- Database migration scripts
- Monitoring and alerting setup
- Documentation and support materials

## Migration from Single-Church Version

### Data Migration Script
- Export existing church data
- Create church record in new system
- Import data with proper church_id references
- Validate data integrity

### Cutover Strategy
- Parallel deployment initially
- Gradual migration of churches
- Sunset single-church version over time