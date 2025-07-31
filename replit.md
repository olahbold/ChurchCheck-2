# ChurchConnect - Biometric Attendance System

## Overview

ChurchConnect is a modern church attendance management system that uses simulated biometric (fingerprint) technology for member registration and check-in. The application is built as a full-stack web application with a React frontend and Express.js backend, using PostgreSQL for data persistence and Drizzle ORM for database operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Architecture
The system follows a monorepo structure with clear separation between client and server code:
- **Frontend**: React 18 with TypeScript, using Vite as the build tool
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management

### Project Structure
- `client/` - React frontend application
- `server/` - Express.js backend API
- `shared/` - Shared TypeScript types and database schema
- `migrations/` - Database migration files

## Key Components

### Frontend Architecture
- **Component Library**: shadcn/ui components built on Radix UI primitives
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Custom fetch wrapper with TanStack Query
- **UI Framework**: Tailwind CSS with custom design tokens

### Backend Architecture
- **API Framework**: Express.js with TypeScript
- **Database Layer**: Drizzle ORM with Neon serverless PostgreSQL
- **Validation**: Zod schemas shared between client and server
- **Error Handling**: Centralized error middleware
- **Logging**: Custom request/response logging

### Database Schema
The system uses six main entities:
- **Members**: Core member information including biometric data
- **Attendance Records**: Daily check-in records with timestamps
- **Follow-up Records**: Tracking member engagement and absences
- **Admin Users**: User access management with role-based permissions
- **Report Configs**: Predefined report templates and configurations
- **Report Runs**: Historical log of generated reports

Key features:
- Family linking through parent-child relationships
- Biometric fingerprint simulation
- Comprehensive attendance tracking
- Automated follow-up management
- Role-based admin access control (Admin, Volunteer, Data Viewer)
- Multi-location church support with region assignment
- Comprehensive analytics and reporting system

## Data Flow

### Member Registration
1. User fills registration form with validation
2. Optional fingerprint enrollment simulation
3. Family member linking capability
4. Data validated and stored in PostgreSQL

### Check-in Process
1. Fingerprint scan simulation or manual search
2. Member identification and verification
3. Attendance record creation with timestamp
4. Family check-in support for parents with children
5. Real-time statistics updates

### Dashboard Analytics
1. Attendance statistics aggregation
2. Member search and filtering
3. Follow-up tracking and management
4. Data export capabilities

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI component primitives
- **react-hook-form**: Form state management
- **zod**: Runtime type validation

### Development Tools
- **Vite**: Frontend build tool with hot module replacement
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first CSS framework
- **drizzle-kit**: Database migration management

### Replit Integration
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Development tooling (conditional)

## Deployment Strategy

### Development Environment
- Vite dev server for frontend with hot reload
- tsx for running TypeScript server code
- Automatic database migrations with drizzle-kit
- Environment variable configuration for database connection

### Production Build
- Vite builds optimized client bundle to `dist/public`
- esbuild bundles server code to `dist/index.js`
- Static file serving through Express
- Single deployment artifact with embedded frontend

### Environment Configuration
- `DATABASE_URL` required for PostgreSQL connection
- Neon serverless database with WebSocket support
- Node.js runtime with ES modules support

### Key Architectural Decisions

#### Database Choice
- **Problem**: Need reliable, scalable database for member and attendance data
- **Solution**: PostgreSQL with Neon serverless hosting
- **Rationale**: ACID compliance, relational data integrity, serverless scalability

#### ORM Selection
- **Problem**: Type-safe database operations with migrations
- **Solution**: Drizzle ORM with TypeScript
- **Rationale**: Excellent TypeScript integration, lightweight, good migration support

#### Component Architecture
- **Problem**: Consistent, accessible UI components
- **Solution**: shadcn/ui built on Radix UI primitives
- **Rationale**: Accessibility built-in, customizable, modern design patterns

#### Monorepo Structure
- **Problem**: Shared types and schemas between client/server
- **Solution**: Monorepo with shared directory
- **Rationale**: Code reuse, type safety across boundaries, simplified deployment

## Recent Changes

### July 31, 2025 - Multi-Tenant SaaS System Fully Operational
- **Complete System Restoration**: Successfully debugged and fixed all critical issues with the multi-tenant SaaS transformation:
  - Fixed duplicate QueryClient instances causing React Query malfunction
  - Resolved authentication token storage and retrieval issues
  - Corrected church-scoped data filtering in all storage methods
  - Fixed TypeScript validation errors in member registration forms
- **Verified System Functionality**: All core features now working perfectly:
  - Member registration with full form validation and biometric enrollment options
  - Dashboard displaying accurate member counts and statistics (currently 5 members)
  - Multi-tenant data isolation ensuring church-specific member access
  - Complete authentication flow with JWT token management
- **Production-Ready Status**: ChurchConnect SaaS is now fully operational with:
  - Comprehensive member management system
  - Biometric attendance tracking capabilities
  - Role-based access control for church administrators
  - Real-time dashboard analytics and reporting
  - Secure multi-church data isolation

## Recent Changes

### July 30, 2025 - Enhanced Header with Church Branding
- **Personalized Header Display**: Updated dashboard header to show church-specific branding:
  - Format: "ChurchConnect | Church Name" with church name in smaller font
  - Dynamic church name loading from localStorage authentication data
  - Color-coded subscription tier badges (Free Trial, Starter, Growth, Enterprise)
  - Enhanced user information display with role badges (Admin, Volunteer, Data Viewer)
  - Professional visual hierarchy with proper typography scaling

### July 30, 2025 - Phase 2 Stripe Integration & Subscription Management Complete
- **Complete Stripe Payment Processing**: Implemented full subscription lifecycle management:
  - Stripe checkout sessions with automatic plan selection and trial handling
  - Subscription creation, updates, cancellation, and reactivation endpoints
  - Webhook handling for real-time subscription status updates
  - Billing portal integration for customer self-service
- **Advanced Feature Gating System**: Built comprehensive access control framework:
  - Feature matrix mapping subscription tiers to available functionality
  - Usage limit enforcement with upgrade prompts for exceeded limits
  - Member count restrictions with automatic blocking when limits reached
  - Trial status monitoring with expiration warnings and grace periods
- **Professional Subscription Management UI**: Created enterprise-grade billing interface:
  - Real-time subscription status dashboard with usage metrics and progress bars
  - Plan comparison and upgrade/downgrade workflows with Stripe integration
  - Billing portal access with external link handling for payment management
  - Trial countdown display with conversion-optimized upgrade prompts
- **Enhanced Business Logic**: Established production-ready SaaS operations:
  - Automatic plan enforcement with feature-specific API endpoint protection
  - Church data isolation with subscription-scoped access controls
  - Usage monitoring for members, reports, and notification limits
  - Subscription tier validation on all protected operations

### July 30, 2025 - Phase 1 Multi-Tenant SaaS Implementation Complete
- **Multi-Tenant Database Architecture**: Successfully implemented complete database schema transformation:
  - Churches table with subscription management and trial tracking
  - Church users table with role-based authentication (admin/volunteer/data_viewer)
  - Subscriptions table for billing integration preparation
  - All existing tables updated with church_id foreign keys for data isolation
  - Complete schema migration with relational integrity and cascade deletes
- **Authentication & Authorization System**: Built comprehensive JWT-based authentication:
  - bcrypt password hashing with church-scoped access control
  - Role-based authorization middleware with permission enforcement
  - Token generation/verification with 7-day expiration
  - Church context middleware ensuring data isolation
- **Church Registration & Management APIs**: Implemented full church lifecycle management:
  - Church registration with automatic subdomain generation
  - User authentication with trial management (30-day full access)
  - Feature gating framework based on subscription tiers
  - Usage monitoring and member limit enforcement
- **Professional SaaS Frontend**: Created conversion-optimized user experience:
  - Landing page with pricing tiers and feature showcase
  - Church registration flow with auto-subdomain generation
  - User authentication pages with persistent sessions
  - Responsive design highlighting biometric technology differentiator
- **Business Model Implementation**: Established freemium SaaS foundation:
  - 30-day trial with unlimited access to drive conversions
  - Three-tier subscription structure: Starter ($19), Growth ($49), Enterprise ($99)
  - Feature matrix with biometric check-in as Growth+ differentiator
  - Foundation for Stripe integration and automated billing

### July 30, 2025 - Multi-Tenant SaaS Platform Planning & Duplicate Creation
- **Strategic Planning**: Developed comprehensive multi-tenant SaaS transformation plan:
  - Freemium model with 30-day full-access trial for new churches
  - Three-tier subscription structure: Starter ($19), Growth ($49), Enterprise ($99)
  - Feature gating based on subscription levels with biometric tech as premium differentiator
  - Church-specific branding, multi-location support, and integration marketplace
- **Development Strategy**: Created separate `churchconnect-saas` directory for safe transformation:
  - Complete project duplication preserving original single-church functionality
  - Parallel development approach allowing gradual migration
  - Risk mitigation through isolated multi-tenant architecture development
- **Implementation Roadmap**: 8-week phased approach covering database schema, authentication, subscription logic, and UI/UX updates
- **Business Model**: Comprehensive revenue strategy including subscriptions, premium integrations, onboarding services, and custom development opportunities

### July 30, 2025 - Bulk Member Data Management Implementation
- **Comprehensive Bulk Upload System**: Added full bulk upload functionality to Settings tab with:
  - CSV template download with all 12 member fields and example data
  - File upload interface with drag-and-drop support
  - Real-time data preview and validation before processing
  - Professional error reporting with specific row-level feedback
  - Bulk processing API endpoint with individual error handling
- **Enhanced Data Management**: Streamlined administrative workflows with:
  - Template-based data entry to ensure consistent formatting
  - Client-side validation for required fields, email formats, and enum values
  - Server-side validation using existing Zod schemas for data integrity
  - Progress tracking and detailed success/error reporting
- **Professional Interface Design**: 
  - Large modal dialog for data review with scrollable table
  - Clear validation error display with specific row references
  - Processing state management with disabled controls during upload
  - Clean cancellation and retry workflows
- **Technical Architecture**: 
  - Reusable CSV parsing with proper quote handling
  - Bulk API endpoint following existing single-member creation patterns
  - Type-safe data processing with comprehensive error collection
  - Integration with existing member management and database schemas

### July 29, 2025 - Enhanced Export Functionality Implementation
- **Fixed Export Attendance History (CSV)**: Now properly generating comprehensive attendance records with:
  - Sequential numbering, member details, and comprehensive contact information
  - Proper date range support (defaults to last 365 days)
  - Enhanced CSV formatting with 10 fields of detailed member and attendance data
- **Fixed Export Monthly Report (CSV)**: Now fully functional with:
  - Monthly summary statistics, demographic breakdowns, and new member tracking
  - Multi-section report format with attendance trends and analytics
  - Professional CSV structure for external analysis and reporting

### July 29, 2025 - Enhanced Reporting Module with Comprehensive Member Details
- **Full Member Details Integration**: Enhanced key reports with complete member information:
  - Missed 3+ Services Report: Now includes title, gender, age group, phone, email, WhatsApp number, address, date of birth, wedding anniversary, last attendance date, and member registration date
  - New Members Report: Complete member profile with title, contact details, address, personal dates, membership status, and full timestamps
  - Follow-up Action Tracker: Comprehensive member information including all contact details, personal information, consecutive absences, last contact details, and member history
  - Member Export (Settings): Enhanced CSV export with all 15 member fields including full contact information, personal dates, and system metadata
- **Enhanced Report Data Structure**: Updated all 8 reports with comprehensive demographic fields:
  - Weekly Attendance Summary: Now includes both gender and age group breakdowns for deeper insights
  - Member Attendance Log: Added gender/age group columns, time-only display for check-in times, sequential numbering, and clear check-in method labels ("Family (manual)", "Manual", "Fingerprint", "Visitor")
  - Group Attendance Trend: Enhanced with both gender and age group demographic breakdowns
  - Family Check-in Summary: Fixed technical issues and now properly displays parent-child relationships with formatted check-in methods
- **Export-Only Report Workflow**: Transformed reporting interface to focus on data export rather than display:
  - Reports no longer show raw data on screen after generation
  - Professional "Report Generated" confirmation screen with download-focused interface
  - Enhanced CSV export with proper sequential numbering for Member Attendance Log
  - Streamlined user experience emphasizing data portability over on-screen viewing
- **Technical Improvements**: Fixed API parameter formatting issues that were preventing report generation, resolved SQL join syntax problems in Family Check-in Summary, and enhanced error handling

### July 29, 2025 - Enhanced Daily Check-in Interface and Duplicate Prevention
- **Dynamic Daily Title**: Changed from "Sunday Check-in" to "Today Check-in" with current date display for improved daily flexibility and multi-service support
- **Comprehensive Duplicate Prevention**: Implemented backend validation to prevent multiple daily check-ins:
  - Database-level duplicate detection for both members and visitors
  - Enhanced error handling with clear user feedback messages
  - Frontend toast notifications for duplicate check-in attempts
  - Improved query client error handling to preserve response metadata
- **System Versatility**: Application now supports any day of the week for services, events, meetings, or special gatherings
- **User Experience**: Clear date reference helps staff know which day's attendance they're managing

### July 29, 2025 - Comprehensive Attendance History System
- **Advanced History Tab**: Complete attendance tracking system with dual-view interface:
  - List view for detailed record browsing with individual member timelines
  - Calendar view with visual attendance indicators and daily summaries
  - Real-time view switching between list and calendar modes
- **Enhanced Filtering System**: Multi-dimensional filtering capabilities:
  - Date range selection with intuitive calendar pickers
  - Individual member timeline tracking and selection
  - Gender, age group, and member type filtering
  - Name-based search with real-time results
  - Smart filter combinations with clear-all functionality
- **Statistical Analytics Dashboard**: Comprehensive metrics for selected date ranges:
  - Total attendance counts and daily averages
  - Member vs visitor breakdowns
  - Gender distribution analysis
  - Age group demographic insights
  - Multi-day attendance pattern analysis
- **Data Export Capabilities**: Professional CSV export functionality:
  - Filtered data export with custom date ranges
  - Comprehensive attendance reports with member details
  - Ready-to-use formats for external analysis
- **Backend API Extensions**: Three new specialized endpoints:
  - `/api/attendance/history` - Historical data with advanced filtering
  - `/api/attendance/date-range` - Available date ranges for UI initialization
  - `/api/attendance/stats-range` - Statistical analysis for date ranges

### July 26, 2025 - External Fingerprint Scanner Integration
- **Real WebAuthn Biometric Authentication**: Integrated device biometric sensors (fingerprint, face, PIN) using WebAuthn API for authentic enrollment and check-in
- **External Scanner Support**: Added comprehensive support for USB and Bluetooth fingerprint scanners with:
  - USB scanner detection and connection (SecuGen, Futronic, AuthenTec, Goodix, etc.)
  - Bluetooth scanner integration for wireless operation
  - Automatic device capability detection and graceful fallbacks
  - Multi-scanner management interface with connection status
- **Smart Scanning Options**: Users can choose between:
  - Device biometrics (phone's built-in sensors)
  - External USB/Bluetooth scanners
  - Simulation mode for testing
- **Enhanced Scanner Interface**: 
  - Real-time scanner status indicators
  - Setup wizard for external scanner configuration
  - Quality-based fingerprint template generation
  - Cross-browser compatibility with WebUSB/WebBluetooth APIs
- **Professional Integration**: Supports pocket-friendly scanners from $20 to professional-grade $500+ systems

### July 27, 2025 - Enhanced Gender/Age Demographics and Registration Features  
- **Separated Demographics**: Replaced single "group" field with separate "gender" (Male/Female) and "ageGroup" (Child/Adolescent/Adult) fields across all forms
- **Consistent Form Structure**: Updated member registration, visitor forms, and first-timer forms to use the same robust dropdown structure
- **Enhanced Registration Biometrics**: Added full biometric authentication options to member registration matching check-in functionality:
  - Device biometric authentication (WebAuthn)
  - Simulation mode for testing
  - External scanner setup option
  - Professional enrollment interface with visual feedback
- **Improved Analytics**: Better demographic tracking with separate gender and age group statistics
- **Database Schema Updates**: Migrated from "group" to "gender" and "ageGroup" columns for better data organization

### July 26, 2025 - Admin Section Implementation
- **Admin User Management**: Complete user access control system with three roles:
  - Admin: Full system access including user management and settings
  - Volunteer: Check-in only access for service helpers
  - Data Viewer: Read-only access to reports and analytics
- **Comprehensive Analytics Dashboard**: 10 specialized reports including:
  - Weekly Attendance Summary by demographic groups
  - Member Attendance Log with individual tracking
  - Missed 3+ Services Report for follow-up identification
  - New Members Report for onboarding tracking
  - Inactive Members Report for engagement monitoring
  - Group-wise Attendance Trends for ministry insights
  - Family Check-in Summary for family ministry
  - Follow-up Action Tracker for pastoral care
  - Service-specific Attendance for special events
  - Exportable Raw Data Log for auditing
- **Multi-location Support**: Region assignment for users in multi-campus churches
- **Report Export System**: CSV export functionality for all reports
- **Database Schema Extensions**: Added admin_users, report_configs, and report_runs tables
- **API Endpoints**: Comprehensive REST API for admin operations and analytics
- **User Interface**: Tabbed admin interface with user management and reports sections