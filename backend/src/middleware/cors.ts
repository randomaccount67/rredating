import cors from 'cors';
import { config } from '../config.js';

const allowedOrigins = [config.frontendUrl];
if (config.nodeEnv !== 'production') {
  allowedOrigins.push('http://localhost:3000');
}

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (origin && allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin || 'none'} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // Cache preflight requests for 24 hours
  optionsSuccessStatus: 200,
});
