import type { Request, Response, NextFunction } from 'express';
import { badRequest } from '../utils/errors.js';
import { getTrackPreview } from '../services/spotify.service.js';

export async function preview(req: Request, res: Response, next: NextFunction) {
  try {
    const url = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!url) throw badRequest('url query param is required');
    const data = await getTrackPreview(url);
    // Cache for 1 hour — track metadata doesn't change
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(data);
  } catch (e) {
    next(e);
  }
}
