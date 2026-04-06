"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { getVehicles } from "@/lib/services/vehicleService";
import { getAllMaintenance, addMaintenance } from "@/lib/services/maintenanceService";
import { getAllStatements, uploadStatement } from "@/lib/services/statementService";
import { Vehicle, MaintenanceLog, MonthlyStatement } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Upload, Download, FileText, Wrench, X } from "lucide-react";
import { format } from "date-fns";

const inputCls = "flex h-9 w-full border px-3 py-1 text-sm bg-white focus:outline-none focus:border-[#c70017] transition-colors rounded-[4px]";
const selectCls = "flex h-9 w-full border px-3 py-1 text-sm bg-white focus:outline-none focus:border-[#c70017] transition-colors rounded-[4px] cursor-pointer";

export default function MaintenancePage() {
  const { profile } = useAuth();
  const { t } = useLanguage();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [statements, setStatements] = useState<MonthlyStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"logs" | "statements">("logs");
  const [showAddLog, setShowAddLog] = useState(false);
  const [showAddStatement, setShowAddStatement] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [submittingLog, setSubmittingLog] = useState(false);

  const [monthYear, setMonthYear] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [v, m, s] = await Promise.all([getVehicles(), getAllMaintenance(), getAllStatements()]);
      setVehicles(v); setMaintenance(m); setStatements(s);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedVehicle) return;
    setSubmittingLog(true);
    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    try {
      const logData: any = { vehicleId: selectedVehicle, description, date: new Date() as any, recordedBy: profile.uid };
      if (cost) logData.cost = Number(cost);
      await addMaintenance(logData, vehicle?.plateNumber || "Unknown");
      setShowAddLog(false); setDescription(""); setCost(""); setSelectedVehicle("");
      await fetchData();
    } catch (e) { console.error(e); alert(t("failed create record")); }
    finally { setSubmittingLog(false); }
  };

  const handleUploadStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !file || !monthYear) return;
    setUploading(true);
    try {
      await uploadStatement(file, monthYear, profile.uid);
      setShowAddStatement(false); setFile(null); setMonthYear("");
      await fetchData();
    } catch (e) { console.error(e); alert(t("failed upload")); }
    finally { setUploading(false); }
  };

  // Stats
  const totalCost = maintenance.reduce((acc, m) => acc + (m.cost || 0), 0);
  const thisMonth = maintenance.filter(m => {
    const d = (m.date as any)?.toDate?.();
    return d && d.getMonth() === new Date().getMonth();
  }).length;

  return (
    <div className="space-y-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="pl-overline mb-1">{t("maintenance records desc")}</p>
          <h1 className="text-4xl font-semibold tracking-tight" style={{ color: "#211b10" }}>{t("maintenance records")}</h1>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 rounded-sm self-start sm:self-auto" style={{ backgroundColor: "#f9ecdb" }}>
          <button
            onClick={() => setView("logs")}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-sm transition-all flex items-center gap-1.5"
            style={{
              backgroundColor: view === "logs" ? "#ffffff" : "transparent",
              color: view === "logs" ? "#211b10" : "#5d3f3c",
              boxShadow: view === "logs" ? "0 1px 4px rgba(33,27,16,0.06)" : "none",
            }}
          >
            <Wrench size={12} /> {t("maintenance logs")}
          </button>
          <button
            onClick={() => setView("statements")}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-sm transition-all flex items-center gap-1.5"
            style={{
              backgroundColor: view === "statements" ? "#ffffff" : "transparent",
              color: view === "statements" ? "#211b10" : "#5d3f3c",
              boxShadow: view === "statements" ? "0 1px 4px rgba(33,27,16,0.06)" : "none",
            }}
          >
            <FileText size={12} /> {t("monthly statements")}
          </button>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      {view === "logs" && (
        <div className="grid grid-cols-2 lg:flex lg:items-end gap-4 lg:gap-x-14">
          <div className="flex flex-col p-4 lg:p-0 rounded-sm lg:rounded-none" style={{ backgroundColor: "rgba(0,0,0,0.02)" }}>
            <span className="text-3xl font-semibold leading-none" style={{ color: "#211b10" }}>{maintenance.length}</span>
            <p className="pl-overline mt-2">{t("maintenance logs")}</p>
          </div>
          <div className="flex flex-col p-4 lg:p-0 rounded-sm lg:rounded-none" style={{ backgroundColor: "rgba(0,0,0,0.02)" }}>
            <span className="text-3xl font-semibold leading-none" style={{ color: "#211b10" }}>{thisMonth}</span>
            <p className="pl-overline mt-2">{t("this month")}</p>
          </div>
          <div className="flex flex-col p-4 lg:p-0 rounded-sm lg:rounded-none col-span-2 lg:col-span-1" style={{ backgroundColor: "rgba(0,0,0,0.02)" }}>
            <span className="text-3xl font-semibold leading-none" style={{ color: "#c70017" }}>
              {totalCost > 0 ? `${t("aed")} ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
            </span>
            <p className="pl-overline mt-2">{t("total cost")}</p>
          </div>
        </div>
      )}

      {view === "logs" ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddLog(!showAddLog)}
              className={showAddLog ? "btn-secondary flex items-center gap-1.5" : "btn-precision flex items-center gap-1.5"}
            >
              {showAddLog ? <><X size={14} /> {t("cancel")}</> : <><Plus size={14} /> {t("log maintenance")}</>}
            </button>
          </div>

          {showAddLog && (
            <div className="p-4 sm:p-6 rounded-sm" style={{ backgroundColor: "#f9ecdb", border: "1px solid rgba(199,0,23,0.15)" }}>
              <p className="pl-overline mb-1">{t("log maint desc")}</p>
              <h2 className="text-base font-semibold mb-5" style={{ color: "#211b10" }}>{t("log maint entry")}</h2>
              <form onSubmit={handleAddMaintenance} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5d3f3c" }}>{t("select vehicle")}</Label>
                  <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} required className={selectCls}>
                    <option value="" disabled>{t("select vehicle placeholder")}</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber} ({t(v.type.toLowerCase())})</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                  <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5d3f3c" }}>{t("description of work")}</Label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} required className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5d3f3c" }}>{t("cost optional")}</Label>
                  <Input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className={inputCls} />
                </div>
                <div className="flex justify-end lg:col-start-4">
                  <button type="submit" disabled={submittingLog} className="btn-precision w-full sm:w-auto flex items-center justify-center gap-1.5">
                    {submittingLog && <Loader2 className="animate-spin w-3 h-3" />}
                    {t("save log")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Logs — Desktop Table */}
          <div className="rounded-sm overflow-hidden hidden md:block" style={{ backgroundColor: "#ffffff" }}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="table-head-precision">
                  <th className="px-5 py-3 text-left">{t("date")}</th>
                  <th className="px-5 py-3 text-left">{t("plate")}</th>
                  <th className="px-5 py-3 text-left">{t("description of work")}</th>
                  <th className="px-5 py-3 text-right">{t("cost")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-12"><Loader2 className="mx-auto h-5 w-5 animate-spin" style={{ color: "#c70017" }} /></td></tr>
                ) : maintenance.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 pl-overline">{t("no maintenance")}</td></tr>
                ) : maintenance.map((m, i) => {
                  const v = vehicles.find(v => v.id === m.vehicleId);
                  return (
                    <tr
                      key={m.id}
                      className="transition-colors cursor-default"
                      style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fff8f2" }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#fff2e0")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? "#ffffff" : "#fff8f2")}
                    >
                      <td className="px-5 py-4 text-xs font-mono whitespace-nowrap" style={{ color: "#5d3f3c" }}>
                        {m.date && (m.date as any).toDate ? format((m.date as any).toDate(), "MMM dd, yyyy") : "—"}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold whitespace-nowrap" style={{ color: "#211b10" }}>{v ? v.plateNumber : "—"}</td>
                      <td className="px-5 py-4 text-sm" style={{ color: "#5d3f3c" }}>{m.description}</td>
                      <td className="px-5 py-4 text-sm font-mono text-right whitespace-nowrap" style={{ color: "#211b10" }}>
                        {m.cost !== undefined ? `${t("aed")} ${m.cost.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Logs — Mobile Cards */}
          <div className="md:hidden space-y-2">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "#c70017" }} /></div>
            ) : maintenance.length === 0 ? (
              <div className="py-10 text-center pl-overline">{t("no maintenance")}</div>
            ) : maintenance.map(m => {
              const v = vehicles.find(v => v.id === m.vehicleId);
              return (
                <div key={m.id} className="rounded-sm p-4" style={{ backgroundColor: "#ffffff" }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#211b10" }}>{v ? v.plateNumber : "—"}</p>
                      <p className="text-xs font-mono mt-0.5" style={{ color: "#a8a29e" }}>
                        {m.date && (m.date as any).toDate ? format((m.date as any).toDate(), "MMM dd, yyyy") : "—"}
                      </p>
                    </div>
                    {m.cost !== undefined && (
                      <span className="text-sm font-mono font-bold" style={{ color: "#c70017" }}>{t("aed")} {m.cost.toFixed(2)}</span>
                    )}
                  </div>
                  <p className="text-sm mt-3 pt-3 border-t" style={{ color: "#5d3f3c", borderColor: "rgba(146,111,107,0.1)" }}>{m.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddStatement(!showAddStatement)}
              className={showAddStatement ? "btn-secondary flex items-center gap-1.5" : "btn-precision flex items-center gap-1.5"}
            >
              {showAddStatement ? <><X size={14} /> {t("cancel")}</> : <><Upload size={14} /> {t("upload statement")}</>}
            </button>
          </div>

          {showAddStatement && (
            <div className="p-4 sm:p-6 rounded-sm" style={{ backgroundColor: "#f9ecdb", border: "1px solid rgba(199,0,23,0.15)" }}>
              <p className="pl-overline mb-1">{t("upload monthly desc")}</p>
              <h2 className="text-base font-semibold mb-5" style={{ color: "#211b10" }}>{t("upload monthly")}</h2>
              <form onSubmit={handleUploadStatement} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5d3f3c" }}>{t("month year")}</Label>
                  <Input type="month" value={monthYear} onChange={e => setMonthYear(e.target.value)} required className={inputCls} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5d3f3c" }}>{t("statement file")}</Label>
                  <Input type="file" accept=".pdf,.xlsx,.xls,.png,.jpg" onChange={e => setFile(e.target.files?.[0] || null)} required className={inputCls + " cursor-pointer"} />
                </div>
                <div className="flex justify-end lg:col-start-4">
                  <button type="submit" disabled={uploading} className="btn-precision w-full sm:w-auto flex items-center justify-center gap-1.5">
                    {uploading && <Loader2 className="animate-spin w-3 h-3" />}
                    {t("upload file")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Statements grid (Always grid-cols-1 on mobile) */}
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "#c70017" }} /></div>
          ) : statements.length === 0 ? (
            <div className="py-14 text-center rounded-sm" style={{ border: "1px dashed rgba(146,111,107,0.3)", color: "#5d3f3c" }}>
              <p className="pl-overline">{t("no statements")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
               {statements.map(s => (
                <div key={s.id} className="p-5 rounded-sm group transition-colors shadow-sm" style={{ backgroundColor: "#ffffff" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#fff8f2")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}
                >
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm font-semibold" style={{ color: "#211b10" }}>{format(new Date(s.monthYear), "MMMM yyyy")}</p>
                    <FileText size={14} style={{ color: "#a8a29e" }} />
                  </div>
                  <p className="text-xs truncate mb-4 font-mono" style={{ color: "#5d3f3c" }}>{s.fileName}</p>
                  <a href={s.fileUrl} target="_blank" rel="noopener noreferrer">
                    <button className="btn-secondary w-full flex items-center justify-center gap-1.5">
                      <Download size={12} /> {t("download")}
                    </button>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
