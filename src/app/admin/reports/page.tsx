"use client";

import { useState, useEffect, useMemo } from "react";
import { getVehicles } from "@/lib/services/vehicleService";
import { getAllTrips } from "@/lib/services/tripService";
import { getAllMaintenance } from "@/lib/services/maintenanceService";
import { Vehicle, Trip, MaintenanceLog } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { Download, Loader2, ChevronLeft, ChevronRight, RefreshCcw, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { useLanguage } from "@/context/LanguageContext";

const toDate = (ts: any): Date => ts?.toDate?.() ? ts.toDate() : new Date();
const fmt = (ts: any) => format(toDate(ts), "MMM dd, yyyy");

const selectCls = "h-9 border px-3 text-sm bg-white rounded-[4px] focus:outline-none focus:border-[#c70017] transition-colors cursor-pointer";

function Pagination({ total, page, pageSize, onPage, onPageSize }: {
  total: number; page: number; pageSize: number;
  onPage: (p: number) => void; onPageSize: (n: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-3 mt-px" style={{ borderTop: "1px solid rgba(146,111,107,0.1)" }}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase" style={{ color: "#5d3f3c" }}>Rows</span>
        <select
          value={pageSize} onChange={e => { onPageSize(Number(e.target.value)); onPage(1); }}
          className={selectCls} style={{ borderColor: "rgba(146,111,107,0.2)" }}
        >
          {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-3 text-xs" style={{ color: "#5d3f3c" }}>
        <span>{total === 0 ? "0" : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
        <button
          className="p-1.5 rounded transition-colors disabled:opacity-30"
          style={{ backgroundColor: "#ede1cf" }}
          onClick={() => onPage(page - 1)} disabled={page <= 1}
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <button
          className="p-1.5 rounded transition-colors disabled:opacity-30"
          style={{ backgroundColor: "#ede1cf" }}
          onClick={() => onPage(page + 1)} disabled={page >= totalPages}
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"trips" | "maintenance">("trips");
  const [exporting, setExporting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);

  const [tripVehicle, setTripVehicle] = useState("");
  const [tripStart, setTripStart] = useState("");
  const [tripEnd, setTripEnd] = useState("");
  const [tripPage, setTripPage] = useState(1);
  const [tripPageSize, setTripPageSize] = useState(10);

  const [maintVehicle, setMaintVehicle] = useState("");
  const [maintStart, setMaintStart] = useState("");
  const [maintEnd, setMaintEnd] = useState("");
  const [maintPage, setMaintPage] = useState(1);
  const [maintPageSize, setMaintPageSize] = useState(10);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [v, tr, m] = await Promise.all([getVehicles(), getAllTrips(), getAllMaintenance()]);
      setVehicles(v); setTrips(tr); setMaintenance(m);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const filteredTrips = useMemo(() => trips.filter(t => {
    const d = toDate(t.date);
    if (tripVehicle && t.vehicleId !== tripVehicle) return false;
    if (tripStart && d < new Date(tripStart)) return false;
    if (tripEnd && d > new Date(tripEnd + "T23:59:59")) return false;
    return true;
  }), [trips, tripVehicle, tripStart, tripEnd]);

  const filteredMaint = useMemo(() => maintenance.filter(m => {
    const d = toDate(m.date);
    if (maintVehicle && m.vehicleId !== maintVehicle) return false;
    if (maintStart && d < new Date(maintStart)) return false;
    if (maintEnd && d > new Date(maintEnd + "T23:59:59")) return false;
    return true;
  }), [maintenance, maintVehicle, maintStart, maintEnd]);

  const pagedTrips = useMemo(() => filteredTrips.slice((tripPage - 1) * tripPageSize, tripPage * tripPageSize), [filteredTrips, tripPage, tripPageSize]);
  const pagedMaint = useMemo(() => filteredMaint.slice((maintPage - 1) * maintPageSize, maintPage * maintPageSize), [filteredMaint, maintPage, maintPageSize]);

  const exportTripsExcel = async () => {
    setExporting("trips-excel");
    try {
      const data = filteredTrips.map(t => {
        const v = vehicles.find(v => v.id === t.vehicleId);
        return { Date: fmt(t.date), "Vehicle Plate": v?.plateNumber || "Unknown", "Make & Model": v?.makeAndModel || "—", Type: t.tripType, "Start Odometer (km)": t.startOdometer, "End Odometer (km)": t.endOdometer, "Distance (km)": t.distance, Notes: t.notes || "" };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Trips");
      XLSX.writeFile(wb, `fmac_trips_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch { alert(t("failed_export")); }
    finally { setExporting(null); }
  };

  const exportTripsPDF = async () => {
    setExporting("trips-pdf");
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14); doc.text("FMAC Fleet — Trip Logs Report", 14, 15);
      doc.setFontSize(9); doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, 14, 21);
      autoTable(doc, {
        startY: 26,
        head: [["Date", "Plate", "Make & Model", "Type", "Start Odo", "End Odo", "Distance", "Notes"]],
        body: filteredTrips.map(t => { const v = vehicles.find(v => v.id === t.vehicleId); return [fmt(t.date), v?.plateNumber || "Unknown", v?.makeAndModel || "—", t.tripType, t.startOdometer.toLocaleString(), t.endOdometer.toLocaleString(), t.distance.toLocaleString(), t.notes || ""]; }),
        styles: { fontSize: 8 },
      });
      doc.save(`fmac_trips_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch { alert(t("failed_export")); }
    finally { setExporting(null); }
  };

  const exportMaintExcel = async () => {
    setExporting("maint-excel");
    try {
      const data = filteredMaint.map(m => { const v = vehicles.find(v => v.id === m.vehicleId); return { Date: fmt(m.date), "Vehicle Plate": v?.plateNumber || "Unknown", "Make & Model": v?.makeAndModel || "—", Description: m.description, "Cost (AED)": m.cost !== undefined ? m.cost : "" }; });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Maintenance");
      XLSX.writeFile(wb, `fmac_maintenance_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch { alert(t("failed_export")); }
    finally { setExporting(null); }
  };

  const exportMaintPDF = async () => {
    setExporting("maint-pdf");
    try {
      const doc = new jsPDF();
      doc.setFontSize(14); doc.text("FMAC Fleet — Maintenance Report", 14, 15);
      doc.setFontSize(9); doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, 14, 21);
      autoTable(doc, {
        startY: 26,
        head: [["Date", "Plate", "Make & Model", "Description", "Cost"]],
        body: filteredMaint.map(m => { const v = vehicles.find(v => v.id === m.vehicleId); return [fmt(m.date), v?.plateNumber || "Unknown", v?.makeAndModel || "—", m.description, m.cost !== undefined ? `AED ${m.cost}` : "—"]; }),
        styles: { fontSize: 9 }, columnStyles: { 3: { cellWidth: 70 } },
      });
      doc.save(`fmac_maintenance_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch { alert(t("failed_export")); }
    finally { setExporting(null); }
  };

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="pl-overline mb-1">{t("reports_desc")}</p>
          <h1 className="text-4xl font-semibold tracking-tight" style={{ color: "#211b10" }}>{t("reports_exports")}</h1>
        </div>
        <button onClick={fetchAll} disabled={loading} className="btn-secondary flex items-center gap-1.5 self-start sm:self-auto">
          <RefreshCcw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex items-center gap-1 p-1 rounded-sm w-full sm:w-fit" style={{ backgroundColor: "#f9ecdb" }}>
        {[
          { id: "trips" as const, icon: <FileSpreadsheet size={12} />, label: t("trip_logs") },
          { id: "maintenance" as const, icon: <FileText size={12} />, label: t("maintenance_logs") },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-sm transition-all flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: activeTab === tab.id ? "#ffffff" : "transparent",
              color: activeTab === tab.id ? "#211b10" : "#5d3f3c",
              boxShadow: activeTab === tab.id ? "0 1px 4px rgba(33,27,16,0.06)" : "none",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── TRIPS TAB ── */}
      {activeTab === "trips" && (
        <div className="space-y-5">
          {/* Filter grid — properly aligned on all screen sizes */}
          <div className="p-4 rounded-sm space-y-4" style={{ backgroundColor: "#f9ecdb" }}>
            {/* Row 1: Vehicle (full width) */}
            <div className="space-y-1">
              <p className="pl-overline">{t("vehicle")}</p>
              <select
                value={tripVehicle}
                onChange={e => { setTripVehicle(e.target.value); setTripPage(1); }}
                className="w-full h-9 border px-3 text-sm bg-white rounded-[4px] focus:outline-none focus:border-[#c70017] transition-colors cursor-pointer"
                style={{ borderColor: "rgba(146,111,107,0.2)" }}
              >
                <option value="">{t("all_vehicles")}</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber}{v.makeAndModel ? ` — ${v.makeAndModel}` : ""}</option>)}
              </select>
            </div>

            {/* Row 2: From / To side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="pl-overline">{t("from_date")}</p>
                <input
                  type="date" value={tripStart}
                  onChange={e => { setTripStart(e.target.value); setTripPage(1); }}
                  className="w-full h-9 border px-3 text-sm bg-white rounded-[4px] focus:outline-none focus:border-[#c70017]"
                  style={{ borderColor: "rgba(146,111,107,0.2)", backgroundColor: "#fff8f2" }}
                />
              </div>
              <div className="space-y-1">
                <p className="pl-overline">{t("to_date")}</p>
                <input
                  type="date" value={tripEnd}
                  onChange={e => { setTripEnd(e.target.value); setTripPage(1); }}
                  className="w-full h-9 border px-3 text-sm bg-white rounded-[4px] focus:outline-none focus:border-[#c70017]"
                  style={{ borderColor: "rgba(146,111,107,0.2)", backgroundColor: "#fff8f2" }}
                />
              </div>
            </div>

            {/* Row 3: Clear + Export buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setTripVehicle(""); setTripStart(""); setTripEnd(""); setTripPage(1); }}
                className="btn-secondary h-9 px-4 text-xs"
              >{t("clear")}</button>
              <div className="flex gap-2 ms-auto">
                <button onClick={exportTripsExcel} disabled={!!exporting || filteredTrips.length === 0}
                  className="btn-secondary flex items-center gap-1.5 h-9 px-4 text-xs disabled:opacity-40">
                  {exporting === "trips-excel" ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  {t("excel")}
                </button>
                <button onClick={exportTripsPDF} disabled={!!exporting || filteredTrips.length === 0}
                  className="btn-precision flex items-center gap-1.5 h-9 px-4 text-xs disabled:opacity-40">
                  {exporting === "trips-pdf" ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  {t("pdf")}
                </button>
              </div>
            </div>
          </div>

          {/* Table — desktop */}
          <div className="rounded-sm overflow-hidden hidden sm:block" style={{ backgroundColor: "#ffffff" }}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="table-head-precision">
                  <th className="px-5 py-3 text-left">{t("date")}</th>
                  <th className="px-5 py-3 text-left">{t("plate")}</th>
                  <th className="px-5 py-3 text-left hidden md:table-cell">{t("make_and_model")}</th>
                  <th className="px-5 py-3 text-left">{t("type_col")}</th>
                  <th className="px-5 py-3 text-right hidden lg:table-cell">{t("start_odo_col")}</th>
                  <th className="px-5 py-3 text-right hidden lg:table-cell">{t("end_odo_col")}</th>
                  <th className="px-5 py-3 text-right">{t("distance")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><Loader2 className="mx-auto h-5 w-5 animate-spin" style={{ color: "#c70017" }} /></td></tr>
                ) : pagedTrips.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 pl-overline">{t("no_trip_records")}</td></tr>
                ) : pagedTrips.map((trip, i) => {
                  const v = vehicles.find(v => v.id === trip.vehicleId);
                  return (
                    <tr key={trip.id} className="transition-colors"
                      style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fff8f2" }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#fff2e0")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? "#ffffff" : "#fff8f2")}
                    >
                      <td className="px-5 py-4 text-xs font-mono whitespace-nowrap" style={{ color: "#5d3f3c" }}>{fmt(trip.date)}</td>
                      <td className="px-5 py-4 text-sm font-semibold whitespace-nowrap" style={{ color: "#211b10" }}>{v?.plateNumber || "Unknown"}</td>
                      <td className="px-5 py-4 text-sm hidden md:table-cell" style={{ color: "#5d3f3c" }}>{v?.makeAndModel || "—"}</td>
                      <td className="px-5 py-4">
                        <span className="fleet-chip" style={{
                          backgroundColor: trip.tripType === "Internal" ? "rgba(0,75,140,0.08)" : "#ede1cf",
                          color: trip.tripType === "Internal" ? "#004b8c" : "#5d3f3c",
                        }}>{trip.tripType}</span>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-right hidden lg:table-cell" style={{ color: "#5d3f3c" }}>{trip.startOdometer.toLocaleString()}</td>
                      <td className="px-5 py-4 text-xs font-mono text-right hidden lg:table-cell" style={{ color: "#5d3f3c" }}>{trip.endOdometer.toLocaleString()}</td>
                      <td className="px-5 py-4 text-sm font-mono font-semibold text-right whitespace-nowrap" style={{ color: "#211b10" }}>{trip.distance} km</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination total={filteredTrips.length} page={tripPage} pageSize={tripPageSize} onPage={setTripPage} onPageSize={setTripPageSize} />
          </div>

          {/* Cards — mobile only */}
          <div className="sm:hidden space-y-2">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "#c70017" }} /></div>
            ) : pagedTrips.length === 0 ? (
              <div className="py-10 text-center pl-overline">{t("no_trip_records")}</div>
            ) : pagedTrips.map(trip => {
              const v = vehicles.find(v => v.id === trip.vehicleId);
              return (
                <div key={trip.id} className="rounded-sm p-4" style={{ backgroundColor: "#ffffff" }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#211b10" }}>{v?.plateNumber || "Unknown"}</p>
                      {v?.makeAndModel && <p className="text-xs mt-0.5" style={{ color: "#5d3f3c" }}>{v.makeAndModel}</p>}
                    </div>
                    <span className="text-base font-bold font-mono" style={{ color: "#c70017" }}>{trip.distance} km</span>
                  </div>
                  <div className="mt-3 pt-3 flex flex-wrap gap-x-6 gap-y-1" style={{ borderTop: "1px solid rgba(146,111,107,0.1)" }}>
                    <span className="text-xs font-mono" style={{ color: "#5d3f3c" }}>{fmt(trip.date)}</span>
                    <span className="fleet-chip" style={{
                      backgroundColor: trip.tripType === "Internal" ? "rgba(0,75,140,0.08)" : "#ede1cf",
                      color: trip.tripType === "Internal" ? "#004b8c" : "#5d3f3c",
                    }}>{trip.tripType}</span>
                    <span className="text-xs" style={{ color: "#a8a29e" }}>{trip.startOdometer.toLocaleString()} → {trip.endOdometer.toLocaleString()} km</span>
                  </div>
                </div>
              );
            })}
            <Pagination total={filteredTrips.length} page={tripPage} pageSize={tripPageSize} onPage={setTripPage} onPageSize={setTripPageSize} />
          </div>
        </div>
      )}

      {/* ── MAINTENANCE TAB ── */}
      {activeTab === "maintenance" && (
        <div className="space-y-5">
          {/* Filter grid */}
          <div className="p-4 rounded-sm space-y-4" style={{ backgroundColor: "#f9ecdb" }}>
            <div className="space-y-1">
              <p className="pl-overline">{t("vehicle")}</p>
              <select
                value={maintVehicle}
                onChange={e => { setMaintVehicle(e.target.value); setMaintPage(1); }}
                className="w-full h-9 border px-3 text-sm bg-white rounded-[4px] focus:outline-none focus:border-[#c70017] transition-colors cursor-pointer"
                style={{ borderColor: "rgba(146,111,107,0.2)" }}
              >
                <option value="">{t("all_vehicles")}</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber}{v.makeAndModel ? ` — ${v.makeAndModel}` : ""}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="pl-overline">{t("from_date")}</p>
                <input
                  type="date" value={maintStart}
                  onChange={e => { setMaintStart(e.target.value); setMaintPage(1); }}
                  className="w-full h-9 border px-3 text-sm bg-white rounded-[4px] focus:outline-none focus:border-[#c70017]"
                  style={{ borderColor: "rgba(146,111,107,0.2)", backgroundColor: "#fff8f2" }}
                />
              </div>
              <div className="space-y-1">
                <p className="pl-overline">{t("to_date")}</p>
                <input
                  type="date" value={maintEnd}
                  onChange={e => { setMaintEnd(e.target.value); setMaintPage(1); }}
                  className="w-full h-9 border px-3 text-sm bg-white rounded-[4px] focus:outline-none focus:border-[#c70017]"
                  style={{ borderColor: "rgba(146,111,107,0.2)", backgroundColor: "#fff8f2" }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setMaintVehicle(""); setMaintStart(""); setMaintEnd(""); setMaintPage(1); }}
                className="btn-secondary h-9 px-4 text-xs"
              >{t("clear")}</button>
              <div className="flex gap-2 ms-auto">
                <button onClick={exportMaintExcel} disabled={!!exporting || filteredMaint.length === 0}
                  className="btn-secondary flex items-center gap-1.5 h-9 px-4 text-xs disabled:opacity-40">
                  {exporting === "maint-excel" ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} {t("excel")}
                </button>
                <button onClick={exportMaintPDF} disabled={!!exporting || filteredMaint.length === 0}
                  className="btn-precision flex items-center gap-1.5 h-9 px-4 text-xs disabled:opacity-40">
                  {exporting === "maint-pdf" ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} {t("pdf")}
                </button>
              </div>
            </div>
          </div>

          {/* Table — desktop */}
          <div className="rounded-sm overflow-hidden hidden sm:block" style={{ backgroundColor: "#ffffff" }}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="table-head-precision">
                  <th className="px-5 py-3 text-left">{t("date")}</th>
                  <th className="px-5 py-3 text-left">{t("plate")}</th>
                  <th className="px-5 py-3 text-left hidden md:table-cell">{t("make_and_model")}</th>
                  <th className="px-5 py-3 text-left">{t("description_of_work")}</th>
                  <th className="px-5 py-3 text-right hidden md:table-cell">{t("cost")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-12"><Loader2 className="mx-auto h-5 w-5 animate-spin" style={{ color: "#c70017" }} /></td></tr>
                ) : pagedMaint.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 pl-overline">{t("no_maint_records")}</td></tr>
                ) : pagedMaint.map((m, i) => {
                  const v = vehicles.find(v => v.id === m.vehicleId);
                  return (
                    <tr key={m.id} className="transition-colors"
                      style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fff8f2" }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#fff2e0")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? "#ffffff" : "#fff8f2")}
                    >
                      <td className="px-5 py-4 text-xs font-mono whitespace-nowrap" style={{ color: "#5d3f3c" }}>{fmt(m.date)}</td>
                      <td className="px-5 py-4 text-sm font-semibold whitespace-nowrap" style={{ color: "#211b10" }}>{v?.plateNumber || "Unknown"}</td>
                      <td className="px-5 py-4 text-sm hidden md:table-cell" style={{ color: "#5d3f3c" }}>{v?.makeAndModel || "—"}</td>
                      <td className="px-5 py-4 text-sm" style={{ color: "#5d3f3c" }}>{m.description}</td>
                      <td className="px-5 py-4 text-sm font-mono text-right hidden md:table-cell" style={{ color: "#211b10" }}>{m.cost !== undefined ? `AED ${m.cost.toFixed(2)}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination total={filteredMaint.length} page={maintPage} pageSize={maintPageSize} onPage={setMaintPage} onPageSize={setMaintPageSize} />
          </div>

          {/* Cards — mobile only */}
          <div className="sm:hidden space-y-2">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "#c70017" }} /></div>
            ) : pagedMaint.length === 0 ? (
              <div className="py-10 text-center pl-overline">{t("no_maint_records")}</div>
            ) : pagedMaint.map(m => {
              const v = vehicles.find(v => v.id === m.vehicleId);
              return (
                <div key={m.id} className="rounded-sm p-4" style={{ backgroundColor: "#ffffff" }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#211b10" }}>{v?.plateNumber || "Unknown"}</p>
                      {v?.makeAndModel && <p className="text-xs mt-0.5" style={{ color: "#5d3f3c" }}>{v.makeAndModel}</p>}
                    </div>
                    {m.cost !== undefined && (
                      <span className="text-sm font-semibold font-mono" style={{ color: "#c70017" }}>AED {m.cost.toFixed(2)}</span>
                    )}
                  </div>
                  <p className="text-sm mt-2" style={{ color: "#5d3f3c" }}>{m.description}</p>
                  <p className="text-xs font-mono mt-2" style={{ color: "#a8a29e" }}>{fmt(m.date)}</p>
                </div>
              );
            })}
            <Pagination total={filteredMaint.length} page={maintPage} pageSize={maintPageSize} onPage={setMaintPage} onPageSize={setMaintPageSize} />
          </div>
        </div>
      )}
    </div>
  );
}

