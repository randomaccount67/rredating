import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { corsMiddleware } from './middleware/cors.js';
import router from './routes/index.js';

const app = express();

app.set('trust proxy', 'loopback'); // Trust Nginx on 127.0.0.1 (one hop from Express)

// H2 fix: Global IP-based rate limiter — protects unauthenticated endpoints
const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100, // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  // Skip rate limiting in development for local testing
  skip: () => config.nodeEnv !== 'production',
});

// M1 fix: Explicit security header configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      // API-only server — no scripts, styles, or frames needed
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

app.use(globalLimiter);
app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));

// All routes
app.use(router);

// Health check (rate limited by global limiter)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`🚀 RRedating API running on port ${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Frontend:    ${config.frontendUrl}`);
});

export default app;
