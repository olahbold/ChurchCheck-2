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

### Key Features and Design Decisions
- **Biometric Integration**: Simulated and real WebAuthn biometric authentication (fingerprint, face, PIN) for registration and check-in, with support for external USB/Bluetooth scanners.
- **Multi-Tenancy (SaaS Model)**: Designed as a SaaS platform with a freemium model. Features include:
    - Dedicated `Churches` table for church-specific data.
    - Role-based access control (Admin, Volunteer, Data Viewer) with JWT authentication.
    - Subscription management (3-tier system: Starter, Growth, Enterprise) with feature gating and usage monitoring (e.g., member limits).
    - Church-specific branding (logo, banner, brand colors).
- **Member Management**: Comprehensive member profiles, family linking, bulk data upload (CSV), and detailed attendance tracking.
- **Reporting & Analytics**: Over 10 specialized reports (e.g., missed services, new members, attendance trends) with comprehensive member details and CSV export functionality. Reports focus on export rather than on-screen display.
- **Daily Check-in**: Dynamic "Today Check-in" interface with robust backend duplicate prevention for daily attendance.
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