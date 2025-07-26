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
The system uses three main entities:
- **Members**: Core member information including biometric data
- **Attendance Records**: Daily check-in records with timestamps
- **Follow-up Records**: Tracking member engagement and absences

Key features:
- Family linking through parent-child relationships
- Biometric fingerprint simulation
- Comprehensive attendance tracking
- Automated follow-up management

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