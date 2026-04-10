import { Request, Response } from 'express';
import { AppError } from './errors.js';

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

/**
 * Wraps an async controller handler with standardized error handling.
 * Catches AppError (returns structured status + message) and unexpected
 * errors (returns 500).
 *
 * Eliminates the identical try/catch boilerplate from every controller.
 *
 * Usage:
 *   export const list = wrap(async (req, res) => {
 *     const result = await service.getInbox(req.profile!);
 *     res.json(result);
 *   });
 */
export function wrap(handler: AsyncHandler): AsyncHandler {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (e) {
      if (e instanceof AppError) {
        res.status(e.statusCode).json({ error: e.message });
        return;
      }
      console.error('Unhandled controller error:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
