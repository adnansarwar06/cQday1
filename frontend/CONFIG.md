# Configuration Guide

## API Configuration

Instead of using environment variables, this application uses a centralized configuration file located at `src/lib/config.ts`.

### Setting up the Backend API URL

1. Open `src/lib/config.ts`
2. Update the `API_BASE_URL` constant at the top of the file:

```typescript
// API base URL - adjust this to match your backend server
// Set to null or empty string to enable demo mode
const API_BASE_URL = 'http://localhost:8000';  // <-- Change this line
```

To enable demo mode, set it to null or empty string:
```typescript
const API_BASE_URL = null; // or ''
```

### Configuration Options

The config file includes:

- **API Configuration**: Base URL and endpoints for backend communication
- **App Configuration**: Application name, version, and UI settings
- **Feature Flags**: Enable/disable specific features
- **Demo Mode**: Automatically enabled when no API URL is configured

### Demo Mode

When no API URL is configured (or when the backend is not available), the application will automatically run in demo mode with:

- Mock chat responses
- Simulated agent reasoning steps
- Interactive suggestion cards
- Full UI functionality without backend dependency

### No Environment Variables Needed

This configuration approach eliminates the need for `.env.local` files. Everything is configured directly in the TypeScript config file, providing:

- **Type safety**: Full TypeScript intellisense and error checking
- **Simplicity**: Single file to edit, no environment variable management
- **Clarity**: All settings are visible and documented in one place
- **Version control**: Configuration can be committed to git (excluding sensitive data) 