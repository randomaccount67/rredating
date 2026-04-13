import { Request, Response } from 'express';
import * as subscriptionService from '../services/subscription.service.js';
import { wrap } from '../utils/handler.js';

export const createCheckout = wrap(async (req: Request, res: Response) => {
  const result = await subscriptionService.createCheckoutSession(req.profile!);
  res.json(result);
});

export const webhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }
  try {
    const result = await subscriptionService.handleWebhook(req.body as Buffer, sig);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook error';
    console.error('[stripe webhook] error:', msg);
    res.status(400).json({ error: msg });
  }
};

export const getStatus = wrap(async (req: Request, res: Response) => {
  const result = await subscriptionService.getStatus(req.profile!);
  res.json(result);
});

export const cancel = wrap(async (req: Request, res: Response) => {
  const result = await subscriptionService.cancelSubscription(req.profile!);
  res.json(result);
});

export const portal = wrap(async (req: Request, res: Response) => {
  const result = await subscriptionService.createPortalSession(req.profile!);
  res.json(result);
});
