"use client";

import { useEffect, useState } from "react";
import { getAllUsers, updateUser } from "@/lib/services/userService";
import { User } from "@/lib/schema";
import { Check, X, ShieldAlert, ShieldCheck, Loader2, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try { setUsers(await getAllUsers()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleApproval = async (uid: string, current: boolean) => {
    try {
      await updateUser(uid, { approved: !current });
      setUsers(users.map(u => u.uid === uid ? { ...u, approved: !current } : u));
    } catch (err) { console.error(err); }
  };

  const handleToggleRole = async (uid: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "driver" : "admin";
    if (confirm(`${t("role change confirm")} ${newRole.toUpperCase()}?`)) {
      try {
        await updateUser(uid, { role: newRole });
        setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      } catch (err) { console.error(err); }
    }
  };

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <div>
        <p className="pl-overline mb-1 leading-tight truncate">{t("user management desc")}</p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight break-words" style={{ color: "#211b10" }}>{t("user management")}</h1>
      </div>

      {/* ── Table (Desktop) ── */}
      <div className="rounded-sm overflow-hidden hidden sm:block" style={{ backgroundColor: "#ffffff" }}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="table-head-precision">
                <th className="px-5 py-3 text-left">{t("user")}</th>
                <th className="px-5 py-3 text-left hidden sm:table-cell">{t("contact")}</th>
                <th className="px-5 py-3 text-left hidden md:table-cell">{t("joined")}</th>
                <th className="px-5 py-3 text-center">{t("status col")}</th>
                <th className="px-5 py-3 text-center hidden sm:table-cell">{t("role col")}</th>
                <th className="px-5 py-3 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><Loader2 className="mx-auto h-5 w-5 animate-spin" style={{ color: "#c70017" }} /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 pl-overline">{t("no users")}</td></tr>
              ) : users.map((u, i) => {
                const isSelf = profile?.uid === u.uid;
                return (
                  <tr
                    key={u.uid}
                    className="transition-colors"
                    style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fff8f2" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#fff2e0")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? "#ffffff" : "#fff8f2")}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-sm flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: "#ede1cf", color: "#5d3f3c" }}
                        >
                          {u.displayName ? u.displayName.charAt(0).toUpperCase() : <UserIcon size={14} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "#211b10" }}>{u.displayName || "—"}</p>
                          {isSelf && <span className="fleet-chip fleet-chip-red">{t("you")}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm hidden sm:table-cell" style={{ color: "#5d3f3c" }}>{u.email}</td>
                    <td className="px-5 py-4 text-xs font-mono hidden md:table-cell" style={{ color: "#5d3f3c" }}>
                      {(u.createdAt as any).toDate ? format((u.createdAt as any).toDate(), "MMM dd, yyyy") : "—"}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`fleet-chip ${u.approved ? "" : "fleet-chip-red"}`}>
                        {u.approved ? t("approved") : t("pending")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center hidden sm:table-cell">
                      <span className="fleet-chip flex items-center justify-center gap-1 w-fit mx-auto">
                        {u.role === "admin" ? <ShieldCheck size={10} /> : <UserIcon size={10} />}
                        {u.role === "admin" ? t("administrator") : t("driver")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {!isSelf && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleApproval(u.uid, u.approved!)}
                            className="p-1.5 rounded transition-colors"
                            title={u.approved ? t("revoke") : t("approve")}
                            style={{ color: u.approved ? "#a8a29e" : "#16a34a" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#c70017")}
                            onMouseLeave={e => (e.currentTarget.style.color = u.approved ? "#a8a29e" : "#16a34a")}
                          >
                            {u.approved ? <X size={14} /> : <Check size={14} />}
                          </button>
                          <button
                            onClick={() => handleToggleRole(u.uid, u.role)}
                            className="p-1.5 rounded transition-colors"
                            title={u.role === "admin" ? t("demote") : t("promote")}
                            style={{ color: "#5d3f3c" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#c70017")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#5d3f3c")}
                          >
                            {u.role === "admin" ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Cards ── */}
      <div className="sm:hidden space-y-2">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "#c70017" }} /></div>
        ) : users.length === 0 ? (
          <div className="py-10 text-center pl-overline">{t("no users")}</div>
        ) : users.map(u => {
          const isSelf = profile?.uid === u.uid;
          return (
            <div key={u.uid} className="rounded-sm p-4" style={{ backgroundColor: "#ffffff" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-sm flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: "#f9ecdb", color: "#5d3f3c" }}
                  >
                    {u.displayName ? u.displayName.charAt(0).toUpperCase() : <UserIcon size={14} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold truncate max-w-[150px]" style={{ color: "#211b10" }}>{u.displayName || "—"}</p>
                    <p className="text-xs truncate max-w-[150px]" style={{ color: "#a8a29e" }}>{u.email}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`fleet-chip ${u.approved ? "" : "fleet-chip-red"}`}>
                    {u.approved ? t("approved") : t("pending")}
                  </span>
                  <span className="fleet-chip flex items-center gap-1">
                    {u.role === "admin" ? <ShieldCheck size={10} /> : <UserIcon size={10} />}
                    {u.role === "admin" ? t("administrator") : t("driver")}
                  </span>
                </div>
              </div>

              {!isSelf && (
                <div className="pt-3 border-t flex justify-end gap-4" style={{ borderColor: "rgba(146,111,107,0.1)" }}>
                  <button
                    onClick={() => handleToggleApproval(u.uid, u.approved!)}
                    className="text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                    style={{ color: u.approved ? "#5d3f3c" : "#16a34a" }}
                  >
                    {u.approved ? <><X size={14} /> {t("revoke")}</> : <><Check size={14} /> {t("approve")}</>}
                  </button>
                  <button
                    onClick={() => handleToggleRole(u.uid, u.role)}
                    className="text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                    style={{ color: "#5d3f3c" }}
                  >
                    {u.role === "admin" ? <><ShieldAlert size={14} /> {t("demote")}</> : <><ShieldCheck size={14} /> {t("promote")}</>}
                  </button>
                </div>
              )}
              {isSelf && (
                <div className="pt-3 border-t text-center" style={{ borderColor: "rgba(146,111,107,0.1)" }}>
                  <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: "#c70017" }}>{t("you")}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
