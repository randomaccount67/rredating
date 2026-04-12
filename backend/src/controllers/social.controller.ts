import { Request, Response } from 'express';
import * as inboxService from '../services/inbox.service.js';
import * as messagesService from '../services/messages.service.js';
import * as notificationsService from '../services/notifications.service.js';
import { wrap } from '../utils/handler.js';

// ─── Inbox ─────────────────────────────────────────────────────

export const listInbox = wrap(async (req: Request, res: Response) => {
  const result = await inboxService.getInbox(req.profile!);
  res.json(result);
});

// ─── Messages ──────────────────────────────────────────────────

export const getMessages = wrap(async (req: Request, res: Response) => {
  const result = await messagesService.getMessages(req.profile!, req.query.conversation_id as string);
  res.json(result);
});

export const sendMessage = wrap(async (req: Request, res: Response) => {
  const result = await messagesService.sendMessage(req.profile!, req.body.conversation_id, req.body.content);
  res.json(result);
});

// ─── Presence ──────────────────────────────────────────────────

export const heartbeat = wrap(async (req: Request, res: Response) => {
  const result = await messagesService.heartbeat(req.profile!.id, req.body.conversation_id ?? null);
  res.json(result);
});

export const leave = wrap(async (req: Request, res: Response) => {
  const result = await messagesService.leave(req.profile!.id, req.body.conversation_id ?? null);
  res.json(result);
});

// ─── Notifications ─────────────────────────────────────────────

export const listNotifications = wrap(async (req: Request, res: Response) => {
  const result = await notificationsService.listNotifications(req.profile!);
  res.json(result);
});

export const markNotificationsRead = wrap(async (req: Request, res: Response) => {
  const result = await notificationsService.markAllRead(req.profile!);
  res.json(result);
});
