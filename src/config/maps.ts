// Google Maps configuration
// Get your API key from: https://console.cloud.google.com/google/maps-apis
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Check if API key is properly configured
if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'your_google_maps_api_key_here') {
  console.warn('⚠️ Google Maps API key not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file');
}

export const MAPS_CONFIG = {
  libraries: ['places', 'geometry'] as const,
  defaultCenter: { lat: 28.6139, lng: 77.2090 }, // New Delhi coordinates
  defaultZoom: 10,
  region: 'IN', // Restrict to India
  language: 'en',
};
