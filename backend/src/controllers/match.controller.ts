import { Request, Response } from 'express';
import * as matchService from '../services/match.service.js';
import { wrap } from '../utils/handler.js';

export const browse = wrap(async (req: Request, res: Response) => {
  const result = await matchService.browse(req.profile!, req.query as Record<string, string>);
  res.json(result);
});

export const sendRequest = wrap(async (req: Request, res: Response) => {
  const result = await matchService.sendRequest(req.profile!, req.body.to_user_profile_id);
  res.json(result);
});

export const respond = wrap(async (req: Request, res: Response) => {
  const result = await matchService.respondToRequest(req.profile!, req.body.request_id, req.body.action);
  res.json(result);
});

export const pass = wrap(async (req: Request, res: Response) => {
  const result = await matchService.pass(req.profile!, req.body.to_user_profile_id);
  res.json(result);
});
