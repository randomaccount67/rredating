/**
 * Lightweight structured logger for security-critical events.
 * Outputs JSON to stdout for easy parsing by log aggregators.
 *
 * M6 fix: Provides audit trail for auth failures, admin actions,
 * account changes, and rate limit hits.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  event: string;
  timestamp: string;
  [key: string]: unknown;
}

function log(level: LogLevel, event: string, data: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...data,
  };
  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const securityLog = {
  /** Failed authentication attempt */
  authFailed(ip: string, path: string, reason: string) {
    log('warn', 'auth_failed', { ip, path, reason });
  },

  /** Rate limit exceeded */
  rateLimited(userId: string, scope: string, ip: string) {
    log('warn', 'rate_limited', { userId, scope, ip });
  },

  /** Admin action performed */
  adminAction(adminId: string, action: string, targetId: string, details?: Record<string, unknown>) {
    log('info', 'admin_action', { adminId, action, targetId, ...details });
  },

  /** Account deleted */
  accountDeleted(profileId: string, authUserId: string) {
    log('info', 'account_deleted', { profileId, authUserId });
  },

  /** User banned/unbanned */
  banToggled(adminId: string, targetId: string, banned: boolean) {
    log('info', 'ban_toggled', { adminId, targetId, banned });
  },

  /** Report created */
  reportCreated(reporterId: string, reportedId: string, reason: string) {
    log('info', 'report_created', { reporterId, reportedId, reason });
  },

  /** User blocked */
  userBlocked(blockerId: string, blockedId: string) {
    log('info', 'user_blocked', { blockerId, blockedId });
  },

  /** Input validation failed */
  validationFailed(ip: string, path: string, errors: string[]) {
    log('warn', 'validation_failed', { ip, path, errors });
  },
};
