import { Request, Response } from 'express';
import { db } from '../services/db.js';
import { wrap } from '../utils/handler.js';

export const getStatus = wrap(async (req: Request, res: Response) => {
  const profileId = req.profile!.id;
  const { data } = await db
    .from('profiles')
    .select('chat_analysis_enabled, has_seen_analysis_announcement')
    .eq('id', profileId)
    .single();

  res.json({
    enabled: (data as Record<string, unknown>)?.chat_analysis_enabled ?? false,
    has_seen_announcement: (data as Record<string, unknown>)?.has_seen_analysis_announcement ?? false,
  });
});

export const toggle = wrap(async (req: Request, res: Response) => {
  const profileId = req.profile!.id;

  const { data: current } = await db
    .from('profiles')
    .select('chat_analysis_enabled')
    .eq('id', profileId)
    .single();

  const currentEnabled = (current as Record<string, unknown>)?.chat_analysis_enabled ?? false;
  const newEnabled = !currentEnabled;

  await db
    .from('profiles')
    .update({ chat_analysis_enabled: newEnabled } as Record<string, unknown>)
    .eq('id', profileId);

  res.json({ enabled: newEnabled });
});

export const dismissAnnouncement = wrap(async (req: Request, res: Response) => {
  const profileId = req.profile!.id;

  await db
    .from('profiles')
    .update({ has_seen_analysis_announcement: true } as Record<string, unknown>)
    .eq('id', profileId);

  res.json({ success: true });
});
