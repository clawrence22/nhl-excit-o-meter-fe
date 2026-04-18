// Environment configuration
const CONFIG = {
    // Set to true for production, false for local development
    PRODUCTION: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
    API_BASE: '/api' 
};