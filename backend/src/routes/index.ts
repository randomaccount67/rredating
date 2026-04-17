import { Router } from 'express';
import multer from 'multer';
import { requireAuth, adminGuard } from '../middleware/auth.js';
import { resolveProfile, requireProfile, requireAvatar } from '../middleware/resolveProfile.js';
import { rateLimit } from '../middleware/rateLimit.js';

// Controllers
import * as user from '../controllers/user.controller.js';
import * as match from '../controllers/match.controller.js';
import * as social from '../controllers/social.controller.js';
import * as moderation from '../controllers/moderation.controller.js';
import * as admin from '../controllers/admin.controller.js';
import * as subscription from '../controllers/subscription.controller.js';
import * as announcement from '../controllers/announcement.controller.js';
import * as gifCtrl from '../controllers/gif.controller.js';

const router = Router();
const uploadMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// Middleware stacks — defined ONCE
const protect = [requireAuth, requireProfile] as const;
const auth = [requireAuth, resolveProfile] as const; // Allows profile to be null (for profile creation)
const adminProtect = [...protect, adminGuard] as const;

// ─── User ──────────────────────────────────────────────────────
router.get('/api/profile',         ...auth,    user.getProfile);
router.post('/api/profile',        ...auth,    rateLimit('profile-create', 5, 60_000), user.createProfile);
router.put('/api/profile',         ...auth,    rateLimit('profile-update', 10, 3_600_000), user.updateProfile);
router.get('/api/profile/:id',     ...protect, user.getPublicProfile);
router.post('/api/upload',         ...protect, rateLimit('upload', 10, 60_000), uploadMiddleware.single('file'), user.uploadAvatar);
router.delete('/api/account',      ...protect, rateLimit('account-delete', 2, 60_000), user.deleteAccount);

// ─── Match ─────────────────────────────────────────────────────
router.get('/api/match',                ...protect, requireAvatar, rateLimit('browse', 60, 60_000), match.browse);
router.post('/api/match',               ...protect, requireAvatar, rateLimit('match', 60, 60_000), match.sendRequest);
router.delete('/api/match',             ...protect, match.unmatch);
router.post('/api/match/respond',       ...protect, match.respond);
router.post('/api/match/pass',          ...protect, match.pass);
router.delete('/api/match/pass',        ...protect, match.deletePass);

// ─── Social ────────────────────────────────────────────────────
router.get('/api/inbox',                ...protect, requireAvatar, social.listInbox);
router.get('/api/messages',             ...protect, requireAvatar, social.getMessages);
router.post('/api/messages',            ...protect, requireAvatar, rateLimit('messages', 30, 60_000), social.sendMessage);
router.get('/api/notifications',        ...protect, social.listNotifications);
router.post('/api/notifications/read',  ...protect, social.markNotificationsRead);
router.post('/api/presence',            ...protect, social.heartbeat);
router.delete('/api/presence',          ...protect, social.leave);

// ─── Moderation ────────────────────────────────────────────────
router.get('/api/block',           ...protect, moderation.getBlockedUsers);
router.post('/api/block',          ...protect, rateLimit('block', 10, 60_000), moderation.blockUser);
router.delete('/api/block',        ...protect, moderation.unblockUser);
router.post('/api/reports',        ...protect, rateLimit('reports', 5, 60_000), moderation.createReport);

// ─── Subscription — webhook has NO auth (Stripe calls it directly) ─────────
router.post('/api/subscription/webhook',         subscription.webhook);
router.post('/api/subscription/create-checkout', ...protect, subscription.createCheckout);
router.get('/api/subscription/status',           ...protect, subscription.getStatus);
router.post('/api/subscription/cancel',          ...protect, subscription.cancel);
router.post('/api/subscription/portal',          ...protect, subscription.portal);

// ─── GIFs (supporter-only proxy to Tenor) ──────────────────────
router.get('/api/gifs/search',   ...protect, gifCtrl.search);
router.get('/api/gifs/trending', ...protect, gifCtrl.trending);

// ─── Announcements (public read) ───────────────────────────────
router.get('/api/announcements/active', announcement.getActive);

// ─── Admin ─────────────────────────────────────────────────────
router.get('/api/admin/users',                  ...adminProtect, admin.listUsers);
router.get('/api/admin/reports',                ...adminProtect, admin.listReports);
router.patch('/api/admin/reports',              ...adminProtect, admin.updateReport);
router.post('/api/admin/ban',                   ...adminProtect, admin.toggleBan);
router.post('/api/admin/verify',                ...adminProtect, admin.toggleVerified);
router.get('/api/admin/conversation',           ...adminProtect, admin.viewConversation);
router.get('/api/admin/announcements',          ...adminProtect, announcement.list);
router.post('/api/admin/announcements',         ...adminProtect, announcement.create);
router.patch('/api/admin/announcements/:id',    ...adminProtect, announcement.update);
router.delete('/api/admin/announcements/:id',   ...adminProtect, announcement.remove);

export default router;
