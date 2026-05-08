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

export const toggleRanked = wrap(async (req: Request, res: Response) => {
  const profileId = req.profile!.id;

  const { data: current } = await db
    .from('profiles')
    .select('ranked_enabled, chat_analysis_enabled')
    .eq('id', profileId)
    .single();

  const c = current as Record<string, unknown> | null;
  const currentRanked = c?.ranked_enabled ?? false;
  const newRanked = !currentRanked;

  const updates: Record<string, unknown> = { ranked_enabled: newRanked };
  let newChatAnalysis = (c?.chat_analysis_enabled ?? false) as boolean;

  if (newRanked && !newChatAnalysis) {
    updates.chat_analysis_enabled = true;
    newChatAnalysis = true;
  }

  await db
    .from('profiles')
    .update(updates)
    .eq('id', profileId);

  res.json({ ranked_enabled: newRanked, chat_analysis_enabled: newChatAnalysis });
});

export const getRankedStatus = wrap(async (req: Request, res: Response) => {
  const profileId = req.profile!.id;

  const { data } = await db
    .from('profiles')
    .select('ranked_enabled, texting_rr, texting_rank, total_messages_analyzed')
    .eq('id', profileId)
    .single();

  const d = data as Record<string, unknown> | null;

  res.json({
    ranked_enabled: d?.ranked_enabled ?? false,
    texting_rr: d?.texting_rr ?? 0,
    texting_rank: d?.texting_rank ?? 'Iron 1',
    total_messages_analyzed: d?.total_messages_analyzed ?? 0,
  });
});

export const getLeaderboard = wrap(async (_req: Request, res: Response) => {
  const { data } = await db
    .from('profiles')
    .select('riot_id, riot_tag, texting_rank, texting_rr, avatar_url')
    .gte('texting_rr', 2100)
    .order('texting_rr', { ascending: false })
    .limit(50);

  res.json({ leaderboard: data ?? [] });
});
