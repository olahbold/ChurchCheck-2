# ChurchConnect SaaS - Multi-Tenant Platform

This is the multi-tenant SaaS version of ChurchConnect, designed to serve multiple churches with subscription-based access.

## Key Differences from Single-Church Version

### Architecture Changes
- Multi-tenant database with church isolation
- Church registration and authentication system
- Subscription management and feature gating
- Church-specific branding and customization

### Subscription Tiers
- **Starter** ($19/month): Basic features, up to 100 members
- **Growth** ($49/month): Full features including biometrics, unlimited members
- **Enterprise** ($99/month): Advanced analytics, integrations, custom branding

### Trial Strategy
- 30-day full access trial for all new churches
- No credit card required during trial
- Graceful transition to selected subscription tier

## Development Status
🚧 **In Development** - Multi-tenant transformation in progress

## Original Single-Church Version
The original single-church version remains in the parent directory as the stable production system.