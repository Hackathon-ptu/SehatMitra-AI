export const API_BASE_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL)) ||
  (typeof process !== 'undefined' && process.env && (process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL)) ||
  "https://sehatmitra-ai.onrender.com/api/v1";

export default API_BASE_URL;
