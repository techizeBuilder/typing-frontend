/**
 * Configuration file for API Base URL
 * Uses environment variable with fallback to localhost
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
