"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Flag,
  Ban,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  X,
} from "lucide-react";

interface AdminUser {
  id: string;
  riot_id: string | null;
  riot_tag: string | null;
  region: string | null;
  created_at: string;
  is_banned: boolean;
  is_admin: boolean;
  about: string | null;
  agents: string[] | null;
  peak_rank: string | null;
  current_rank: string | null;
  role: string | null;
  gender: string | null;
  favorite_artist: string | null;
  music_tags: string[] | null;
  avatar_url: string | null;
}

interface AdminReport {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string | null;
  reviewed: boolean;
  created_at: string;
  reporter: {
    id: string;
    riot_id: string | null;
    riot_tag: string | null;
  } | null;
  reported: {
    id: string;
    riot_id: string | null;
    riot_tag: string | null;
  } | null;
}

function displayName(
  user: { riot_id: string | null; riot_tag: string | null } | null,
) {
  if (!user?.riot_id) return "UNKNOWN#0000";
  return `${user.riot_id}#${user.riot_tag}`;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [viewingMessages, setViewingMessages] = useState<{
    report: AdminReport;
    messages: {
      id: string;
      sender_id: string;
      content: string;
      created_at: string;
    }[];
  } | null>(null);
  const [msgLoading, setMsgLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, reportsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/reports"),
      ]);

      if (usersRes.status === 403 || reportsRes.status === 403) {
        router.replace("/");
        return;
      }
      if (!usersRes.ok || !reportsRes.ok) throw new Error("Failed to load");

      const usersData = await usersRes.json();
      const reportsData = await reportsRes.json();
      setUsers(usersData.users ?? []);
      setReports(reportsData.reports ?? []);
    } catch {
      setError("Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBan = async (profileId: string, ban: boolean) => {
    setActionLoading(profileId);
    try {
      const res = await fetch("/api/admin/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId, ban }),
      });
      if (!res.ok) throw new Error("Failed");
      setUsers((prev) =>
        prev.map((u) => (u.id === profileId ? { ...u, is_banned: ban } : u)),
      );
      if (selectedUser?.id === profileId)
        setSelectedUser((prev) => (prev ? { ...prev, is_banned: ban } : prev));
    } catch {
      setError("Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkReviewed = async (reportId: string) => {
    setActionLoading(reportId);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId }),
      });
      if (!res.ok) throw new Error("Failed");
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, reviewed: true } : r)),
      );
    } catch {
      setError("Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const viewConversation = async (report: AdminReport) => {
    setMsgLoading(true);
    setViewingMessages({ report, messages: [] });
    try {
      const res = await fetch(
        `/api/admin/conversation?user_a=${report.reporter_id}&user_b=${report.reported_id}`,
      );
      const d = await res.json();
      setViewingMessages({ report, messages: d.messages ?? [] });
    } catch {
      setError("Failed to load messages.");
      setViewingMessages(null);
    } finally {
      setMsgLoading(false);
    }
  };

  const unreviewedReports = reports.filter((r) => !r.reviewed);
  const userReports = selectedUser
    ? reports.filter((r) => r.reported_id === selectedUser.id)
    : [];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#1A1D24] w-64" />
          <div className="h-64 bg-[#1A1D24]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <span className="font-mono text-[10px] tracking-widest text-[#FF4655] uppercase">
          // RESTRICTED ACCESS
        </span>
        <h1
          className="font-extrabold text-4xl uppercase text-[#E8EAF0] mt-1"
          style={{ fontFamily: "Barlow Condensed, sans-serif" }}
        >
          ADMIN CONSOLE
        </h1>
        <div className="flex gap-4 mt-2 font-mono text-[10px] text-[#525566]">
          <span>{users.length} USERS</span>
          <span>{reports.length} REPORTS</span>
          <span
            className={unreviewedReports.length > 0 ? "text-[#FF4655]" : ""}
          >
            {unreviewedReports.length} UNREVIEWED
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-[#FF4655]/10 border border-[#FF4655]/30 px-4 py-2 font-mono text-xs text-[#FF4655]">
          {error}
        </div>
      )}

      {/* Unreviewed reports banner */}
      {unreviewedReports.length > 0 && (
        <div
          className="mb-6 bg-[#1A1D24] border border-[#FF4655]/30"
          style={{
            clipPath:
              "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)",
          }}
        >
          <div className="px-5 py-3 border-b border-[#2A2D35] flex items-center gap-2">
            <AlertTriangle size={13} className="text-[#FF4655]" />
            <span className="font-mono text-xs text-[#FF4655] uppercase tracking-wider">
              {unreviewedReports.length} Unreviewed Report
              {unreviewedReports.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-[#2A2D35]">
            {unreviewedReports.map((r) => (
              <div
                key={r.id}
                className="px-5 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-[#FF4655] border border-[#FF4655]/30 px-1.5 py-0.5">
                      {r.reason}
                    </span>
                    <span className="font-mono text-[10px] text-[#525566]">
                      {displayName(r.reporter)} → {displayName(r.reported)}
                    </span>
                  </div>
                  {r.details && (
                    <p className="text-[#525566] text-xs mt-1 truncate">
                      {r.details}
                    </p>
                  )}
                  <p className="font-mono text-[9px] text-[#525566] mt-0.5">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => viewConversation(r)}
                    className="font-mono text-[10px] text-[#8B8FA8] hover:text-[#E8EAF0] border border-[#2A2D35] px-2 py-1 transition-colors flex items-center gap-1"
                  >
                    <MessageSquare size={10} /> MSGS
                  </button>
                  <button
                    onClick={() => {
                      const u = users.find((u) => u.id.toLowerCase() === r.reported_id.toLowerCase());
                      if (u) {
                        setSelectedUser(u);
                      } else {
                        console.warn(
                          "Reported user not found in users list:",
                          r.reported_id,
                        );
                      }
                    }}
                    className="font-mono text-[10px] text-[#8B8FA8] hover:text-[#E8EAF0] border border-[#2A2D35] px-2 py-1 transition-colors"
                  >
                    VIEW USER
                  </button>
                  <button
                    onClick={() => handleMarkReviewed(r.id)}
                    disabled={actionLoading === r.id}
                    className="font-mono text-[10px] text-[#525566] hover:text-green-400 border border-[#2A2D35] px-2 py-1 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={11} className="inline mr-1" />
                    REVIEWED
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Users list */}
        <div
          className="lg:col-span-2 bg-[#1A1D24] border border-[#2A2D35]"
          style={{
            clipPath:
              "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)",
          }}
        >
          <div className="px-4 py-3 border-b border-[#2A2D35] flex items-center gap-2">
            <Shield size={12} className="text-[#525566]" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#8B8FA8]">
              All Users
            </span>
          </div>
          <div className="divide-y divide-[#2A2D35] max-h-[600px] overflow-y-auto">
            {users.map((u) => {
              const name = u.riot_id
                ? `${u.riot_id}#${u.riot_tag}`
                : "NO PROFILE";
              const reportCount = reports.filter(
                (r) => r.reported_id === u.id,
              ).length;
              const unreviewedCount = reports.filter(
                (r) => r.reported_id === u.id && !r.reviewed,
              ).length;
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-[#13151A] transition-colors ${selectedUser?.id === u.id ? "bg-[#13151A] border-l-2 border-[#FF4655]" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#E8EAF0] truncate">
                        {name}
                      </span>
                      {u.is_banned && (
                        <span className="font-mono text-[8px] text-[#FF4655] border border-[#FF4655]/30 px-1">
                          BANNED
                        </span>
                      )}
                      {u.is_admin && (
                        <span className="font-mono text-[8px] text-amber-400 border border-amber-400/30 px-1">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {u.region && (
                        <span className="font-mono text-[9px] text-[#525566]">
                          {u.region}
                        </span>
                      )}
                      <span className="font-mono text-[9px] text-[#525566]">
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                      {reportCount > 0 && (
                        <span
                          className={`font-mono text-[9px] ${unreviewedCount > 0 ? "text-[#FF4655]" : "text-[#525566]"}`}
                        >
                          <Flag size={8} className="inline mr-0.5" />
                          {reportCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    size={12}
                    className="text-[#525566] flex-shrink-0"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* User detail panel */}
        <div className="lg:col-span-3">
          {!selectedUser ? (
            <div
              className="bg-[#1A1D24] border border-[#2A2D35] h-full min-h-[300px] flex items-center justify-center"
              style={{
                clipPath:
                  "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)",
              }}
            >
              <p className="font-mono text-[10px] text-[#525566] uppercase">
                Select a user to view details
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Profile card */}
              <div
                className="bg-[#1A1D24] border border-[#2A2D35]"
                style={{
                  clipPath:
                    "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)",
                }}
              >
                <div className="px-5 py-4 border-b border-[#2A2D35] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 flex-shrink-0 border border-[#2A2D35] overflow-hidden"
                      style={{
                        clipPath:
                          "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)",
                      }}
                    >
                      {selectedUser.avatar_url ? (
                        <img
                          src={selectedUser.avatar_url}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#13151A] flex items-center justify-center">
                          <span className="font-mono text-[10px] text-[#525566]">
                            {selectedUser.riot_id?.[0]?.toUpperCase() ?? "?"}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Name/ID */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-mono text-sm text-[#E8EAF0]">
                          {selectedUser.riot_id
                            ? `${selectedUser.riot_id}#${selectedUser.riot_tag}`
                            : "NO PROFILE"}
                        </h2>
                        {selectedUser.is_banned && (
                          <span className="font-mono text-[9px] text-[#FF4655] border border-[#FF4655]/30 px-1.5 py-0.5">
                            BANNED
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[9px] text-[#525566] mt-0.5">
                        ID: {selectedUser.id}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleBan(selectedUser.id, !selectedUser.is_banned)
                    }
                    disabled={actionLoading === selectedUser.id}
                    className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-2 transition-all disabled:opacity-50 ${
                      selectedUser.is_banned
                        ? "border border-green-500/30 text-green-400 hover:bg-green-500/10"
                        : "border border-[#FF4655]/30 text-[#FF4655] hover:bg-[#FF4655]/10"
                    }`}
                    style={{
                      fontFamily: "Barlow Condensed, sans-serif",
                      clipPath:
                        "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)",
                    }}
                  >
                    <Ban size={13} />
                    {actionLoading === selectedUser.id
                      ? "..."
                      : selectedUser.is_banned
                        ? "UNBAN USER"
                        : "BAN USER"}
                  </button>
                </div>

                <div className="px-5 py-4 grid grid-cols-2 gap-3 text-xs border-b border-[#2A2D35]">
                  {[
                    ["Region", selectedUser.region],
                    ["Gender", selectedUser.gender],
                    ["Peak Rank", selectedUser.peak_rank],
                    ["Current Rank", selectedUser.current_rank],
                    ["Role", selectedUser.role],
                    ["Fav Artist", selectedUser.favorite_artist],
                    [
                      "Joined",
                      new Date(selectedUser.created_at).toLocaleDateString(),
                    ],
                    ["Agents", selectedUser.agents?.join(", ")],
                  ].map(([label, value]) =>
                    value ? (
                      <div key={label as string}>
                        <span className="label text-[9px] block">
                          {label as string}
                        </span>
                        <span className="font-mono text-[11px] text-[#8B8FA8]">
                          {value as string}
                        </span>
                      </div>
                    ) : null,
                  )}
                </div>

                {selectedUser.about && (
                  <div className="px-5 py-3">
                    <span className="label text-[9px] block mb-1">ABOUT</span>
                    <p className="text-[#8B8FA8] text-xs leading-relaxed">
                      {selectedUser.about}
                    </p>
                  </div>
                )}
              </div>

              {/* Reports against this user */}
              <div
                className="bg-[#1A1D24] border border-[#2A2D35]"
                style={{
                  clipPath:
                    "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)",
                }}
              >
                <div className="px-4 py-3 border-b border-[#2A2D35] flex items-center gap-2">
                  <Flag size={11} className="text-[#525566]" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#8B8FA8]">
                    Reports ({userReports.length})
                  </span>
                </div>
                {userReports.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="font-mono text-[10px] text-[#525566]">
                      No reports filed against this user.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#2A2D35]">
                    {userReports.map((r) => (
                      <div
                        key={r.id}
                        className="px-4 py-3 flex items-start justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`font-mono text-[9px] border px-1.5 py-0.5 ${r.reviewed ? "border-[#2A2D35] text-[#525566]" : "border-[#FF4655]/30 text-[#FF4655]"}`}
                            >
                              {r.reason}
                            </span>
                            {r.reviewed && (
                              <span className="font-mono text-[9px] text-green-500">
                                ✓ REVIEWED
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[9px] text-[#525566] mt-1">
                            By: {displayName(r.reporter)} ·{" "}
                            {new Date(r.created_at).toLocaleDateString()}
                          </p>
                          {r.details && (
                            <p className="text-[#8B8FA8] text-[11px] mt-1 leading-relaxed">
                              {r.details}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex flex-col gap-1">
                          <button
                            onClick={() => viewConversation(r)}
                            className="font-mono text-[9px] text-[#8B8FA8] hover:text-[#E8EAF0] border border-[#2A2D35] px-2 py-1 transition-colors flex items-center gap-1"
                          >
                            <MessageSquare size={9} /> MSGS
                          </button>
                          {!r.reviewed && (
                            <button
                              onClick={() => handleMarkReviewed(r.id)}
                              disabled={actionLoading === r.id}
                              className="font-mono text-[9px] text-[#525566] hover:text-green-400 border border-[#2A2D35] px-2 py-1 transition-colors disabled:opacity-50"
                            >
                              REVIEWED
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Message viewer modal */}
      {viewingMessages && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setViewingMessages(null)}
        >
          <div className="absolute inset-0 bg-black/80" />
          <div
            className="relative bg-[#1A1D24] border border-[#2A2D35] w-full max-w-lg max-h-[80vh] flex flex-col"
            style={{
              clipPath:
                "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2D35] flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquare size={12} className="text-[#525566]" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#8B8FA8]">
                    Conversation Log
                  </span>
                </div>
                <p className="font-mono text-[9px] text-[#525566] mt-0.5">
                  {displayName(viewingMessages.report.reporter)} →{" "}
                  {displayName(viewingMessages.report.reported)}
                  <span className="ml-2 text-[#FF4655]">
                    ({viewingMessages.report.reason})
                  </span>
                </p>
              </div>
              <button
                onClick={() => setViewingMessages(null)}
                className="text-[#525566] hover:text-[#E8EAF0] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {msgLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-[#13151A] animate-pulse" />
                  ))}
                </div>
              ) : viewingMessages.messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="font-mono text-[10px] text-[#525566]">
                    No conversation found between these users.
                  </p>
                </div>
              ) : (
                viewingMessages.messages.map((msg) => {
                  const isReporter =
                    msg.sender_id === viewingMessages.report.reporter_id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isReporter ? "items-start" : "items-end"}`}
                    >
                      <span className="font-mono text-[8px] text-[#525566] mb-0.5 px-1">
                        {isReporter
                          ? displayName(viewingMessages.report.reporter)
                          : displayName(viewingMessages.report.reported)}
                      </span>
                      <div
                        className={`max-w-xs px-3 py-2 text-xs ${
                          isReporter
                            ? "bg-[#13151A] border border-[#2A2D35] text-[#E8EAF0]"
                            : "bg-[#FF4655]/10 border border-[#FF4655]/20 text-[#E8EAF0]"
                        }`}
                        style={{
                          clipPath:
                            "polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 0 100%)",
                        }}
                      >
                        <p className="break-words">{msg.content}</p>
                        <p className="font-mono text-[9px] text-[#525566] mt-1">
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
