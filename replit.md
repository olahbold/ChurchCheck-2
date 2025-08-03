# ChurchConnect - Biometric Attendance System

## Overview
ChurchConnect is a full-stack web application for modern church attendance management. It uses simulated biometric technology for member registration and check-in, providing a solution for tracking attendance, managing member data, and generating reports. The system supports multi-location churches with role-based access control and offers analytics for pastoral care and engagement monitoring. Its core vision is to streamline church administration through efficient, secure, and data-driven member management, with a business vision as a SaaS platform offering a freemium model.

## User Preferences
Preferred communication style: Simple, everyday language.

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
- **Biometric Integration**: Supports simulated and real WebAuthn biometric authentication (fingerprint, face, PIN) for registration and check-in, including external USB/Bluetooth scanners.
- **Multi-Tenancy (SaaS Model)**: Implemented with a `Churches` table, role-based access control (Admin, Volunteer, Data Viewer) using JWT, subscription management (3-tier system: Starter, Growth, Enterprise) with feature gating and usage monitoring, and church-specific branding.
- **Member Management**: Comprehensive member profiles, family linking, bulk data upload (CSV), and detailed attendance tracking.
- **Reporting & Analytics**: Over 10 specialized reports (e.g., missed services, new members, attendance trends) with comprehensive member details and CSV export functionality. Reports are designed for export.
- **Event-Based Check-in**: Advanced check-in system requiring event selection. Supports biometric and manual methods with event-specific records. Allows multiple event check-ins per day but prevents duplicate check-ins for the same event on the same day. Includes external check-in with unique URLs and PINs.
- **Demographics**: Separate `gender` (Male/Female) and `ageGroup` (Child/Adolescent/Adult) fields for granular demographic tracking.
- **Database & ORM**: PostgreSQL with Neon serverless for scalability and Drizzle ORM for type-safe operations and migrations.
- **UI/UX**: shadcn/ui built on Radix UI for consistent, accessible, and customizable components. Visual consistency achieved across all sections with uniform animated stat cards, spring physics, gradient progress bars, and color-coded themes. Super Admin dashboards and all platform operations sections also align with this design.
- **Monorepo Structure**: Facilitates shared types and schemas, promoting code reuse and type safety.
- **Kiosk Mode**: Comprehensive functionality for member self check-in, configurable session timeouts, and real-time settings synchronization. Kiosk sessions extend admin authentication. Supports all active events simultaneously.
- **User Experience**: Enhanced with narration and guidance content across major user touchpoints, including forms, dashboards, and reporting sections, using clear instructions, visual indicators, and contextual tips.
- **Reporting Enhancements**: Member Attendance Log redesigned for Excel-style matrix reports with attendance patterns, color-coded indicators, and comprehensive CSV export. Dual attendance metrics display both today's and total historical attendance for events using natural language narration format ("Today: X attendees, Total: Y attendees").

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