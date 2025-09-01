# Just Ask - Survey Application

A modern, dynamic survey application built with React, TypeScript, and SurveyJS that supports multi-tenant survey management with cascading dropdowns and comprehensive response tracking.

## Features

- 🎯 **Dynamic Survey Management** - Create and manage surveys across multiple customers and namespaces
- 🔄 **Cascading Dropdowns** - Dynamic field dependencies with API-driven data loading
- 📊 **Response Viewer** - View and export survey responses with pagination
- 🏢 **Multi-tenant Architecture** - Support for multiple customers and namespaces
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 💾 **CSV Export** - Export survey responses to CSV format
- 🎨 **Modern UI** - Clean, gradient-themed interface with smooth animations

## Prerequisites

- Node.js 16+ 
- npm or yarn
- Backend API server (optional - app includes demo mode)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd just-ask-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will open at http://localhost:3000

4. **Build for production**
   ```bash
   npm run build
   npm run preview  # Preview the production build
   ```

## Project Structure

```
src/
├── api/           # API client and service functions
├── components/    
│   ├── Survey/    # SurveyJS components and renderer
│   └── common/    # Shared components (Layout, LoadingSpinner)
├── hooks/         # Custom React hooks
├── pages/         
│   ├── SurveySelectorPage.tsx  # Survey selection interface
│   ├── SurveyPage.tsx          # Survey taking interface
│   └── SurveyResponsesPage.tsx # Response viewing interface
├── surveys/       # Survey definitions
│   └── demoSurvey.ts           # Demo survey for offline mode
├── types/         # TypeScript type definitions
└── App.tsx        # Main application component
```

## Application Flow

1. **Survey Selector** (`/`) - Landing page where users select:
   - Customer
   - Namespace  
   - Survey

2. **Take Survey** (`/survey`) - Displays the selected survey
   - Requires survey parameters from Survey Selector
   - Shows demo survey if backend is unavailable

3. **View Responses** (`/responses`) - Browse survey responses
   - Dynamic table based on survey structure
   - Pagination and CSV export
   - Real-time response count

## Backend API Integration

The application expects a backend API with the following endpoints:

### Core Endpoints

```
GET  /api/v1/operations/customers
GET  /api/v1/operations/customers/{hex}/namespaces  
GET  /api/v1/operations/customers/{hex}/namespaces/{namespace}/surveys
GET  /api/v1/operations/customers/{hex}/namespaces/{namespace}/responses
GET  /{hex}/{namespace}/survey?survey_name={name}
POST /{hex}/{namespace}/responses?survey_name={name}
```

### Response Formats

**Customers Response:**
```json
{
  "customers": [
    {
      "id": "1",
      "name": "Customer Name",
      "hex_id": "32-character-hex-string"
    }
  ]
}
```

**Namespaces Response:**
```json
{
  "namespaces": [
    {
      "id": "1",
      "name": "Namespace Name",
      "slug": "namespace-slug",
      "description": "Optional description"
    }
  ]
}
```

**Surveys Response:**
```json
{
  "surveys": [
    {
      "survey_id": "survey-identifier",
      "name": "Survey Name",
      "version": "1.0",
      "response_count": 42,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

## Demo Mode

When the backend API is not available, the application automatically falls back to demo mode:

- Shows a demo survey with information about API configuration
- Displays connection status and setup instructions
- Allows testing of survey functionality without a backend
- Demo submissions are not saved

## Environment Variables

Create a `.env` file in the root directory (optional):

```env
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=false
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality

### Adding New Surveys

1. Create a new survey definition in `src/surveys/`
2. Follow the SurveyJS JSON schema format
3. Import and use in `SurveyPage.tsx`

Example survey structure:
```typescript
export const mySurvey = {
  title: "My Survey",
  pages: [
    {
      elements: [
        {
          type: "text",
          name: "question1",
          title: "Your question here"
        }
      ]
    }
  ]
}
```

### Customizing Styles

- Global styles: `src/App.css`
- Component styles: Adjacent `.css` files
- Theme colors: Gradient theme using `#667eea` and `#764ba2`

## Troubleshooting

### Port Already in Use
If port 3000 is occupied, Vite will automatically try the next available port (3001, 3002, etc.)

### Backend Connection Issues
- Verify the backend server is running
- Check CORS configuration on the backend
- Ensure API endpoints match the expected format
- The app will show the demo survey if backend is unavailable

### Survey Not Loading
- Confirm all three parameters are selected (customer, namespace, survey)
- Check browser console for API errors
- Verify survey JSON format is valid

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **SurveyJS** - Survey rendering engine
- **React Router v6** - Client-side routing
- **Vite** - Build tool and dev server
- **CSS3** - Styling with modern features

## License

[Your License Here]

## Support

For issues and questions, please create an issue in the repository.