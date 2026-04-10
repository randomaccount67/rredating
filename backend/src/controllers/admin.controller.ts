import { Request, Response } from 'express';
import * as adminService from '../services/admin.service.js';
import { wrap } from '../utils/handler.js';

export const listUsers = wrap(async (_req: Request, res: Response) => {
  const result = await adminService.listUsers();
  res.json(result);
});

export const listReports = wrap(async (_req: Request, res: Response) => {
  const result = await adminService.listReports();
  res.json(result);
});

export const updateReport = wrap(async (req: Request, res: Response) => {
  const result = await adminService.markReportReviewed(req.body.report_id);
  res.json(result);
});

export const toggleBan = wrap(async (req: Request, res: Response) => {
  const result = await adminService.toggleBan(req.profile!, req.body.profile_id, req.body.ban);
  res.json(result);
});

export const viewConversation = wrap(async (req: Request, res: Response) => {
  const result = await adminService.viewConversation(
    req.query.user_a as string,
    req.query.user_b as string,
  );
  res.json(result);
});
