import cors from 'cors';
import { config } from '../config.js';

const allowedOrigins = [config.frontendUrl];
if (config.nodeEnv !== 'production') {
  allowedOrigins.push('http://localhost:3000');
}

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or health checks)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // Cache preflight requests for 24 hours
  optionsSuccessStatus: 200,
});
