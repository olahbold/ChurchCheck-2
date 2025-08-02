# ChurchConnect - Biometric Attendance System

## Overview
ChurchConnect is a full-stack web application designed for modern church attendance management. It leverages simulated biometric (fingerprint) technology for member registration and check-in, providing a comprehensive solution for tracking attendance, managing member data, and generating insightful reports. The system supports multi-location churches with role-based access control and offers advanced analytics for pastoral care and engagement monitoring. Its core vision is to streamline church administration through efficient, secure, and data-driven member management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Architecture
The system employs a monorepo structure, separating client and server concerns:
- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS, shadcn/ui, Wouter for routing, React Hook Form with Zod for forms, and TanStack Query for state management.
- **Backend**: Express.js with TypeScript, utilizing Drizzle ORM for database interactions, Zod for shared validation schemas, and centralized error handling.
- **Database**: PostgreSQL, specifically designed for multi-tenancy with `church_id` foreign keys across all relevant tables, and managed via Drizzle ORM and Neon serverless.

### Project Structure
- `client/`: React frontend application.
- `server/`: Express.js backend API.
- `shared/`: Shared TypeScript types and database schema definitions, including Zod schemas.
- `migrations/`: Database migration files.

### Recent Changes (January 2025)
- **Super Admin Dashboard Phase 1 Complete**: Fully functional Super Admin authentication and church management system with working View, Suspend/Activate, and Search functionality. Fixed runtime errors and enhanced UI with comprehensive church details modals.
- **Security Enhancement**: Implemented comprehensive suspended church access prevention - both login blocking and API access blocking with proper JWT middleware validation.
- **Super Admin Dashboard Phase 2 Complete**: Implemented comprehensive Business Operations section with revenue metrics, subscription analytics, churn analysis, and automated report generation. Features tabbed navigation between Dashboard and Business Operations views.
- **Event Management Module Complete**: Advanced event-based attendance system with comprehensive event creation, management, and event-specific check-in flow. Features include event types (Sunday Service, Prayer Meeting, Bible Study, Youth Group, Special Event, Other), event scheduling, organizer management, and event-based analytics. Duplicate prevention ensures users cannot check into the same event multiple times per day.
- **Attendance Display Enhancement (August 2025)**: Fixed visitor name display in attendance records - no longer showing "Unknown Member" but actual visitor names. Improved formatting consistency between check-in tab and history tab with proper visitor/member status badges and green circular avatars.
- **Database Compatibility Fix (August 2025)**: Resolved PostgreSQL-specific syntax issues in report generation by removing TO_CHAR functions and using standard SQL. Fixed "Missed 3+ Services Report" 500 errors and improved overall database compatibility for all reporting features.
- **Family Check-in Enhancement (August 2025)**: Fixed missing Family buttons by updating member search API to include children data. Enhanced family check-in error handling with detailed feedback showing which family members succeeded/failed and specific reasons (already checked in vs other errors). Family check-in now works seamlessly with proper duplicate prevention messaging.
- **Kiosk Mode Implementation (August 2025)**: Implemented comprehensive kiosk mode functionality for member self check-in. Features include admin-controlled session timeouts (15 minutes to 8 hours), dedicated kiosk settings API endpoints, improved data persistence at creation and update points, and enhanced UI with real-time settings synchronization. Fixed route conflicts and TypeScript issues for production-ready deployment.
- **Kiosk Session Persistence (August 2025)**: Enhanced kiosk mode with automatic admin session extension during active kiosk periods. When a kiosk session is started, the admin authentication token is automatically extended to match the kiosk timeout duration plus buffer time, ensuring uninterrupted member self check-in capability without requiring admin to stay logged in or re-authenticate during the session.

### Key Features and Design Decisions
- **Biometric Integration**: Simulated and real WebAuthn biometric authentication (fingerprint, face, PIN) for registration and check-in, with support for external USB/Bluetooth scanners.
- **Multi-Tenancy (SaaS Model)**: Designed as a SaaS platform with a freemium model. Features include:
    - Dedicated `Churches` table for church-specific data.
    - Role-based access control (Admin, Volunteer, Data Viewer) with JWT authentication.
    - Subscription management (3-tier system: Starter, Growth, Enterprise) with feature gating and usage monitoring (e.g., member limits).
    - Church-specific branding (logo, banner, brand colors).
- **Member Management**: Comprehensive member profiles, family linking, bulk data upload (CSV), and detailed attendance tracking.
- **Reporting & Analytics**: Over 10 specialized reports (e.g., missed services, new members, attendance trends) with comprehensive member details and CSV export functionality. Reports focus on export rather than on-screen display.
- **Event-Based Check-in**: Advanced check-in system requiring event selection before member attendance tracking. Supports both biometric and manual check-in methods with event-specific attendance records. Business rule: Users can check into multiple events per day, but cannot have duplicate check-ins to the same event within a day.
- **Demographics**: Separate `gender` (Male/Female) and `ageGroup` (Child/Adolescent/Adult) fields for granular demographic tracking.
- **Database Choice**: PostgreSQL with Neon serverless for scalability, ACID compliance, and relational integrity.
- **ORM Selection**: Drizzle ORM for type-safe database operations and migration support.
- **Component Architecture**: shadcn/ui built on Radix UI for consistent, accessible, and customizable UI components.
- **Monorepo Structure**: Facilitates shared types and schemas between client and server, promoting code reuse and type safety.

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: PostgreSQL serverless driver.
- **drizzle-orm**: Type-safe ORM for database operations.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/***: Headless UI component primitives.
- **react-hook-form**: Form state management.
- **zod**: Runtime type validation.
- **sharp**: Image processing for branding assets.
- **bcrypt**: Password hashing.
- **jsonwebtoken**: JWT for authentication.
- **stripe**: Payment processing and subscription management.

### Development Tools
- **Vite**: Frontend build tool.
- **TypeScript**: Static type checking.
- **Tailwind CSS**: Utility-first CSS framework.
- **drizzle-kit**: Database migration management.
- **tsx**: For running TypeScript server code.
- **esbuild**: For bundling server code.

### Replit Integration (Conditional)
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay.
- **@replit/vite-plugin-cartographer**: Development tooling.
```