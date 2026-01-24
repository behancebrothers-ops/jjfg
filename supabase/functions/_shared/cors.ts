// Allowed origins for CORS - restrict to your actual domains
const allowedOrigins = [
  'https://luxee-store.vercel.app', // Production domain
  'https://luxurious-store.vercel.app', // Legacy production domain
  'http://localhost:5173', // Development
  'http://localhost:4173', // Preview
  'http://localhost:3000', // Alternative dev port
];

const isAllowedOrigin = (origin: string) => {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const url = new URL(origin);
    const host = url.hostname;
    return (
      host.endsWith('.vercel.app') ||
      host.endsWith('.lovable.app') ||
      host.endsWith('.lovableproject.com') ||
      host === 'localhost'
    );
  } catch {
    return false;
  }
};

export const getCorsHeaders = (requestOrigin: string | null) => {
  const origin = requestOrigin || '';
  const allowed = isAllowedOrigin(origin);
  
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://luxee-store.vercel.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
  };
};

// Default CORS headers (fallback)
export const corsHeaders = getCorsHeaders(null);
