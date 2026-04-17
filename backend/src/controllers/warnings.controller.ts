import { Request, Response } from 'express';
import { wrap } from '../utils/handler.js';
import * as warningsService from '../services/warnings.service.js';

export const warnUser = wrap(async (req: Request, res: Response) => {
  const result = await warningsService.createWarning(
    req.profile!.id,
    req.body.user_id,
    req.body.message,
  );
  res.json(result);
});

export const getUserWarnings = wrap(async (req: Request, res: Response) => {
  const result = await warningsService.getWarningsForUser(String(req.params.user_id));
  res.json(result);
});

export const getWarningCounts = wrap(async (req: Request, res: Response) => {
  const { user_ids } = req.body as { user_ids: unknown };
  if (!Array.isArray(user_ids)) {
    res.status(400).json({ error: 'user_ids must be an array' });
    return;
  }
  const counts = await warningsService.getWarningCounts(
    (user_ids as unknown[]).slice(0, 100).filter((id): id is string => typeof id === 'string'),
  );
  res.json({ counts });
});

export const getActiveWarnings = wrap(async (req: Request, res: Response) => {
  const result = await warningsService.getActiveWarnings(req.profile!.id);
  res.json(result);
});

export const acknowledgeWarning = wrap(async (req: Request, res: Response) => {
  const result = await warningsService.acknowledgeWarning(
    String(req.params.id),
    req.profile!.id,
  );
  res.json(result);
});
