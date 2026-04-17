import { Request, Response } from 'express';
import * as announcementService from '../services/announcement.service.js';
import { wrap } from '../utils/handler.js';

export const getActive = wrap(async (_req: Request, res: Response) => {
  const result = await announcementService.getActiveAnnouncement();
  res.json(result);
});

export const list = wrap(async (_req: Request, res: Response) => {
  const result = await announcementService.listAnnouncements();
  res.json(result);
});

export const create = wrap(async (req: Request, res: Response) => {
  const { content, is_active = false } = req.body;
  const result = await announcementService.createAnnouncement(content, Boolean(is_active));
  res.status(201).json(result);
});

export const update = wrap(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await announcementService.updateAnnouncement(id, req.body);
  res.json(result);
});

export const remove = wrap(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await announcementService.deleteAnnouncement(id);
  res.json(result);
});
