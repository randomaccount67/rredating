import { Request, Response } from 'express';
import * as profileService from '../services/profile.service.js';
import * as uploadService from '../services/upload.service.js';
import * as accountService from '../services/account.service.js';
import { wrap } from '../utils/handler.js';
import { uuidSchema } from '../utils/validation.js';

// ─── Profile ───────────────────────────────────────────────────

export const getProfile = wrap(async (req: Request, res: Response) => {
  const profile = req.profile || await profileService.getProfile(req.userId!, req.userEmail);
  res.json({ profile: profile || null });
});

export const createProfile = wrap(async (req: Request, res: Response) => {
  const profile = await profileService.createProfile(req.userId!, req.body, req.userEmail);
  res.json({ profile });
});

export const updateProfile = wrap(async (req: Request, res: Response) => {
  const profile = await profileService.updateProfile(req.userId!, req.body);
  res.json({ profile });
});

export const getPublicProfile = wrap(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  // H5 fix: Validate UUID format for URL parameter
  if (!uuidSchema.safeParse(id).success) {
    res.status(400).json({ error: 'Invalid profile ID format' });
    return;
  }
  const profile = await profileService.getPublicProfile(id);
  res.json({ profile });
});

// ─── Upload ────────────────────────────────────────────────────

export const uploadAvatar = wrap(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }
  const result = await uploadService.uploadAvatar(req.userId!, {
    buffer: file.buffer,
    mimetype: file.mimetype,
    originalname: file.originalname,
    size: file.size,
  });
  res.json(result);
});

// ─── Account ───────────────────────────────────────────────────

export const deleteAccount = wrap(async (req: Request, res: Response) => {
  const result = await accountService.deleteAccount(req.profile!);
  res.json(result);
});
