import type { Request, Response, NextFunction } from 'express';
import { forbidden } from '../utils/errors.js';
import * as gif from '../services/gif.service.js';

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.profile?.is_supporter) throw forbidden('GIF search is a supporter-only feature');
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) throw forbidden('q is required');
    const gifs = await gif.searchGifs(q);
    res.json({ gifs });
  } catch (e) {
    next(e);
  }
}

export async function trending(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.profile?.is_supporter) throw forbidden('GIF search is a supporter-only feature');
    const gifs = await gif.trendingGifs();
    res.json({ gifs });
  } catch (e) {
    next(e);
  }
}
