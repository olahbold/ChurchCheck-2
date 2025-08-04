# ChurchConnect - Biometric Attendance System

## Overview
ChurchConnect is a full-stack web application for modern church attendance management. It uses simulated biometric technology for member registration and check-in, providing a solution for tracking attendance, managing member data, and generating reports. The system supports multi-location churches with role-based access control and offers analytics for pastoral care and engagement monitoring. Its core vision is to streamline church administration through efficient, secure, and data-driven member management, with a business vision as a SaaS platform offering a freemium model.

## Current Status (January 2025)
The application is fully operational and deployed on Replit. All critical TypeScript compilation errors have been resolved, and the system is running successfully on port 5000. Recent fixes include:
- Fixed missing fingerprint scanner component implementation
- Resolved database storage interface errors
- Corrected client-side type errors in React components
- Implemented proper error handling and type safety across the application
- All core features are functional including member management, event check-in, reporting, and kiosk mode

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes & Fixes (January 2025)
✅ **Critical System Fixes Applied:**
- Fixed missing `client/src/components/fingerprint-scanner.tsx` component that was causing import errors
- Resolved duplicate function definitions in `server/storage.ts` 
- Fixed TypeScript compilation errors across all React components
- Corrected storage interface method implementations for database operations
- Added proper type safety and error handling to all client-side components
- Fixed array type checking in kiosk settings and check-in components
- Resolved authentication request typing in server routes

✅ **Enhanced User Experience:**
- **Searchable Family Dropdown**: Enhanced the registration page family selection with a modern searchable combobox
  - Replaced basic HTML select with shadcn/ui Command component
  - Added real-time search functionality to filter through existing families
  - Improved visual design with check marks and modern UI styling
  - Maintained all existing family selection logic and relationships
  - Better user experience for churches with many families

✅ **Production-Ready Data Management (January 2025):**
- **Database Cleanup**: Removed 15 test/dummy member records for production readiness
- **Follow-up Queue Accuracy**: Fixed duplicate member records causing incorrect flagging (reduced from 17 to 2 genuine cases)
- **Real Attendance Data**: Replaced hardcoded "Last attended" dates with actual attendance history
- **Enhanced Member Search**: Fixed filtering functionality in Member Directory by name, email, and phone
- **Authentic Statistics**: Dashboard now displays only real member data (9 members, 7 with attendance history)

✅ **System Status:**
- Application successfully running on port 5000
- All API endpoints responding correctly (members, events, attendance, etc.)
- Database connectivity confirmed and operational
- Login system working with proper error handling
- Member management, event check-in, and reporting features all functional
- Enhanced registration form with improved family selection UX
- Clean production-ready statistics and follow-up queue

## System Architecture

### Full-Stack Architecture
The system utilizes a monorepo structure with distinct client and server components:
- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS, shadcn/ui, Wouter for routing, React Hook Form with Zod for forms, and TanStack Query for state management.
- **Backend**: Express.js with TypeScript, Drizzle ORM for database interactions, Zod for shared validation schemas, and centralized error handling.
- **Database**: PostgreSQL, designed for multi-tenancy with `church_id` foreign keys, managed via Drizzle ORM and Neon serverless.

### Project Structure
- `client/`: React frontend application.
- `server/`: Express.js backend API.
- `shared/`: Shared TypeScript types and database schema definitions, including Zod schemas.
- `migrations/`: Database migration files.

### Key Features and Design Decisions
- **Biometric Integration**: Supports simulated and real WebAuthn biometric authentication (fingerprint, face, PIN) for registration and check-in, including external USB/Bluetooth scanners. Fingerprint scanner component now fully implemented with proper error handling.
- **Multi-Tenancy (SaaS Model)**: Implemented with a `Churches` table, role-based access control (Admin, Volunteer, Data Viewer) using JWT, subscription management (3-tier system: Starter, Growth, Enterprise) with feature gating and usage monitoring, and church-specific branding.
- **Member Management**: Comprehensive member profiles, family linking, bulk data upload (CSV), and detailed attendance tracking. All CRUD operations working correctly with proper type safety.
- **Reporting & Analytics**: Over 10 specialized reports (e.g., missed services, new members, attendance trends) with comprehensive member details and CSV export functionality. Enhanced analytics dashboard with 7 comprehensive tabs including Check-in Methods analysis, Event Popularity comparison, Member Engagement scoring, and Attendance Heatmap Calendar with intensity-based visualization. **Family Ministry Analytics**: Comprehensive family insights including Family Lifecycle Dashboard (tracking life stages: Young Families, Growing Families, Teen Families, Empty Nest, Multi-Generational with transition support identification), Family Check-in Behavior Analysis (group vs individual preferences, biometric adoption rates, workflow optimization recommendations), Family Attendance Synchronization (family unity patterns), and Family Engagement Score (weighted composite metric combining attendance, unity, diversity, and consistency) with pastoral care recommendations for at-risk families and leadership opportunities.
- **Event-Based Check-in**: Advanced check-in system requiring event selection. Supports biometric and manual methods with event-specific records. Allows multiple event check-ins per day but prevents duplicate check-ins for the same event on the same day. Includes external check-in with unique URLs and PINs. All components properly typed and error-handled.
- **Demographics**: Separate `gender` (Male/Female) and `ageGroup` (Child/Adolescent/Adult) fields for granular demographic tracking.
- **Database & ORM**: PostgreSQL with Neon serverless for scalability and Drizzle ORM for type-safe operations and migrations. Storage interface fully implemented with all required methods.
- **UI/UX**: shadcn/ui built on Radix UI for consistent, accessible, and customizable components. Visual consistency achieved across all sections with uniform animated stat cards, spring physics, gradient progress bars, and color-coded themes. Super Admin dashboards and all platform operations sections also align with this design.
- **Monorepo Structure**: Facilitates shared types and schemas, promoting code reuse and type safety. All TypeScript compilation errors resolved.
- **Kiosk Mode**: Comprehensive functionality for member self check-in, configurable session timeouts, and real-time settings synchronization. Kiosk sessions extend admin authentication. Supports all active events simultaneously. Component properly implemented with type safety.
- **User Experience**: Enhanced with narration and guidance content across major user touchpoints, including forms, dashboards, and reporting sections, using clear instructions, visual indicators, and contextual tips.
- **Reporting Enhancements**: Member Attendance Log redesigned for Excel-style matrix reports with attendance patterns, color-coded indicators, and comprehensive CSV export. Dual attendance metrics display both today's and total historical attendance for events using separate compact badges: blue "X today" badge for current day activity and green "X total" badge for historical attendance.

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