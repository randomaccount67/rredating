import { Request, Response } from 'express';
import * as moderationService from '../services/moderation.service.js';
import { wrap } from '../utils/handler.js';

// ─── Block ─────────────────────────────────────────────────────

export const blockUser = wrap(async (req: Request, res: Response) => {
  const result = await moderationService.blockUser(req.profile!, req.body.blocked_profile_id);
  res.json(result);
});

export const getBlockedUsers = wrap(async (req: Request, res: Response) => {
  const result = await moderationService.getBlockedUsers(req.profile!);
  res.json(result);
});

export const unblockUser = wrap(async (req: Request, res: Response) => {
  const result = await moderationService.unblockUser(req.profile!, req.body.blocked_profile_id);
  res.json(result);
});

// ─── Reports ───────────────────────────────────────────────────

export const createReport = wrap(async (req: Request, res: Response) => {
  const result = await moderationService.createReport(
    req.profile!,
    req.body.reported_profile_id,
    req.body.reason,
    req.body.details,
  );
  res.json(result);
});
