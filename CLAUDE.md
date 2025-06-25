# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start both frontend and backend**: `npm run dev`
- **Start frontend only**: `npm run dev:frontend`
- **Start backend only**: `npm run dev:backend`
- **Start backend in production mode**: `npm run server`
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`
- **Install dependencies**: `npm install`

## Application Architecture

This is a React-based SaaS management application built with Vite and TypeScript. The app helps organizations track and manage their software subscriptions, renewals, and requests.

### Core Data Model

All application state is managed through localStorage with mock data initialization via `services/apiService.ts`. The main entities include:

- **Software**: Complete subscription records with vendor info, costs, renewal dates, integrations, and documents
- **Users**: Role-based (Admin, Software Owner, Department Head) with ownership assignments
- **Departments**: Organizational units for software allocation
- **Requests**: Software procurement requests (specific software or general needs)
- **Audits**: Scheduled reviews of software usage and compliance
- **Feature Tags**: Categorization system for software capabilities

### Route Structure

The app uses HashRouter with the following main routes:
- `/` - Dashboard with metrics and overview
- `/software` - Software inventory listing and management
- `/software/:id` - Individual software details and management
- `/requests` - Software request management
- `/renewals` - Renewal tracking and notifications
- `/audits` - Audit scheduling and tracking
- `/overlap` - Feature overlap analysis between software

### Data Management

- **Database**: SQLite database with full relational schema in `server/database.js`
- **API Layer**: `services/apiService.ts` provides HTTP-based CRUD operations
- **Backend**: Express server in `server/` with RESTful API endpoints
- **Types**: Comprehensive TypeScript definitions in `types.ts`

### Component Organization

- **Pages**: Feature-specific page components in `pages/`
- **Components**: Reusable UI components in `components/`
- **Layout**: Main layout with sidebar navigation and routing structure

### Special Considerations

- Environment variables: `GEMINI_API_KEY` required for AI features
- Path alias: `@/*` resolves to project root
- Backend runs on port 3001, frontend on default Vite port (5173)
- SQLite database automatically initialized and seeded on first run
- All API endpoints use RESTful conventions with `/api` prefix