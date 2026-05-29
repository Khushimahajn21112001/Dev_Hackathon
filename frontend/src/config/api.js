// API Configuration
// In production (Vercel), set VITE_API_URL environment variable to your backend URL
// For local development, it defaults to http://localhost:5000

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default API_BASE_URL;
