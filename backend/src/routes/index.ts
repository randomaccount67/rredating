import { Router } from 'express';
import multer from 'multer';
import { requireAuth, adminGuard } from '../middleware/auth.js';
import { resolveProfile, requireProfile } from '../middleware/resolveProfile.js';
import { rateLimit } from '../middleware/rateLimit.js';

// Controllers
import * as user from '../controllers/user.controller.js';
import * as match from '../controllers/match.controller.js';
import * as social from '../controllers/social.controller.js';
import * as moderation from '../controllers/moderation.controller.js';
import * as admin from '../controllers/admin.controller.js';

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
router.get('/api/match',                ...protect, rateLimit('browse', 60, 60_000), match.browse);
router.post('/api/match',               ...protect, rateLimit('match', 20, 3_600_000), match.sendRequest);
router.post('/api/match/respond',       ...protect, match.respond);
router.post('/api/match/pass',          ...protect, match.pass);

// ─── Social ────────────────────────────────────────────────────
router.get('/api/inbox',                ...protect, social.listInbox);
router.get('/api/messages',             ...protect, social.getMessages);
router.post('/api/messages',            ...protect, rateLimit('messages', 30, 60_000), social.sendMessage);
router.get('/api/notifications',        ...protect, social.listNotifications);
router.post('/api/notifications/read',  ...protect, social.markNotificationsRead);
router.post('/api/presence',            ...protect, social.heartbeat);
router.delete('/api/presence',          ...protect, social.leave);

// ─── Moderation ────────────────────────────────────────────────
router.get('/api/block',           ...protect, moderation.getBlockedUsers);
router.post('/api/block',          ...protect, rateLimit('block', 10, 60_000), moderation.blockUser);
router.delete('/api/block',        ...protect, moderation.unblockUser);
router.post('/api/reports',        ...protect, rateLimit('reports', 5, 60_000), moderation.createReport);

// ─── Admin ─────────────────────────────────────────────────────
router.get('/api/admin/users',        ...adminProtect, admin.listUsers);
router.get('/api/admin/reports',      ...adminProtect, admin.listReports);
router.patch('/api/admin/reports',    ...adminProtect, admin.updateReport);
router.post('/api/admin/ban',         ...adminProtect, admin.toggleBan);
router.get('/api/admin/conversation', ...adminProtect, admin.viewConversation);

export default router;
