# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript application using SurveyJS for dynamic survey forms with cascading dropdowns. The application demonstrates integration with a backend API for lookup data management.

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Survey Library**: SurveyJS (survey-core, survey-react-ui)
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **HTTP Client**: Axios

## Commands

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Project Architecture

### Directory Structure
```
src/
├── api/           # API client and service functions
├── components/    # React components
│   ├── Survey/    # SurveyJS components
│   ├── Lookups/   # Lookup management components
│   └── common/    # Shared components (Layout, LoadingSpinner)
├── hooks/         # Custom React hooks for data fetching
├── pages/         # Page components (Survey, Admin, Import)
├── types/         # TypeScript type definitions
├── utils/         # Utility functions (auth, cache)
├── surveys/       # Survey JSON definitions
└── mocks/         # Mock server for development

```

### Key Features

1. **Dynamic Dropdowns**: Cascading dropdowns that load data based on parent selections
2. **Mock Server**: Development mode includes mock API responses (toggle with VITE_USE_MOCK env var)
3. **Caching**: Client-side caching with localStorage for better performance
4. **Admin Interface**: Manage lookup data through admin panel
5. **Bulk Import**: CSV import functionality for lookup data

### API Integration

The app expects a backend API at `http://localhost:8000` with these endpoints:
- `GET /api/v1/lookups/{namespace}` - Get lookups for a namespace
- `POST /api/v1/lookups/bulk` - Bulk import lookups
- `PUT /api/v1/lookups/{namespace}/{key}` - Update a lookup
- `DELETE /api/v1/lookups/{namespace}/{key}` - Delete a lookup

### Environment Variables

Create a `.env` file based on `.env.example`:
- `VITE_API_URL`: Backend API URL
- `VITE_TENANT_ID`: Tenant identifier for multi-tenancy
- `VITE_USE_MOCK`: Enable mock server (true/false)

### Development Notes

- Mock server is enabled by default in development (VITE_USE_MOCK=true)
- The application uses authentication headers (Bearer token and X-Tenant-ID)
- Cascading dropdowns use URL placeholders like `{parent_field}` for dynamic queries
- All API responses are cached to reduce server load