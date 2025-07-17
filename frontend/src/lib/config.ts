// Configuration file for the frontend application

// API base URL - adjust this to match your backend server
// Set to null or empty string to enable demo mode
const API_BASE_URL = 'http://localhost:8000';

export const config = {
  // API Configuration
  api: {
    // Backend API base URL
    baseUrl: API_BASE_URL,
    
    // API endpoints
    endpoints: {
      chat: '/v2/assistant',
      fileTools: '/file-tools',
      webSearch: '/web-search'
    }
  },
  
  // App Configuration
  app: {
    name: 'AI Assistant',
    version: '1.0.0',
    
    // Demo mode - automatically enabled when baseUrl is null/empty
    demoMode: !API_BASE_URL,
    
    // UI Configuration
    ui: {
      maxMessages: 100,
      typingDelay: 50,
      animationDuration: 300
    }
  },
  
  // Feature flags
  features: {
    fileTools: true,
    webSearch: true,
    agentTrace: true,
    syntaxHighlighting: true
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string = '') => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function to check if we're in demo mode
export const isDemoMode = () => {
  return !API_BASE_URL;
};

export default config; 