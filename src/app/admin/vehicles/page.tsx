"use client";

import { useEffect, useState } from "react";
import { getVehicles, addVehicle, deleteVehicle, updateVehicle } from "@/lib/services/vehicleService";
import { Vehicle } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, Loader2, RefreshCcw, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const Pip = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    "Active": "#16a34a",
    "In Maintenance": "#c70017",
    "Out of Service": "#a8a29e",
  };
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: colors[status] || "#a8a29e" }}
    />
  );
};

export default function VehiclesPage() {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [plateNumber, setPlateNumber] = useState("");
  const [makeAndModel, setMakeAndModel] = useState("");
  const [type, setType] = useState<"Car" | "Bus">("Car");
  const [currentOdometer, setCurrentOdometer] = useState<number>(0);
  const [status, setStatus] = useState<"Active" | "In Maintenance" | "Out of Service">("Active");

  const fetchVehicles = async () => {
    setLoading(true);
    try { setVehicles(await getVehicles()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber.trim()) return;
    try {
      await addVehicle({ plateNumber: plateNumber.toUpperCase(), makeAndModel: makeAndModel.trim() || undefined, type, currentOdometer: Number(currentOdometer), status });
      setAdding(false); setPlateNumber(""); setMakeAndModel(""); setCurrentOdometer(0); setType("Car"); setStatus("Active");
      await fetchVehicles();
    } catch (err) { console.error(err); alert(t("failed_add_vehicle")); }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("delete_vehicle_confirm"))) {
      try { await deleteVehicle(id); setVehicles(prev => prev.filter(v => v.id !== id)); }
      catch (err) { console.error(err); alert(t("failed_delete")); }
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateVehicle(id, { status: newStatus as any });
      setVehicles(prev => prev.map(v => v.id === id ? { ...v, status: newStatus as any } : v));
    } catch (err) { console.error(err); alert(t("failed_update_status")); }
  };

  const handleEditOdometer = async (id: string, current: number) => {
    const val = window.prompt(t("edit_odometer_prompt"), current.toString());
    if (val === null) return;
    const parsed = Number(val);
    if (isNaN(parsed) || parsed < 0) { alert(t("invalid_odometer")); return; }
    try {
      await updateVehicle(id, { currentOdometer: parsed });
      setVehicles(prev => prev.map(v => v.id === id ? { ...v, currentOdometer: parsed } : v));
    } catch (err) { console.error(err); alert(t("failed_update_odometer")); }
  };

  const inputCls = "flex h-9 w-full border px-3 py-1 text-sm bg-white focus:outline-none focus:border-[#c70017] transition-colors rounded-[4px]";
  const selectCls = "flex h-9 w-full border px-3 py-1 text-sm bg-white focus:outline-none focus:border-[#c70017] transition-colors rounded-[4px] cursor-pointer";

  return (
    <div className="space-y-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="pl-overline mb-1">{t("fleet_vehicles_desc")}</p>
          <h1 className="text-4xl font-semibold tracking-tight" style={{ color: "#211b10" }}>{t("fleet_vehicles")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchVehicles}
            className="p-2 rounded transition-colors"
            style={{ backgroundColor: "#ede1cf", color: "#5d3f3c" }}
            disabled={loading}
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setAdding(!adding)}
            className="btn-precision flex items-center gap-1.5"
          >
            {adding ? <><X size={14} /> {t("cancel")}</> : <><Plus size={14} /> {t("add_vehicle")}</>}
          </button>
        </div>
      </div>

      {/* ── Add Vehicle Form ── */}
      {adding && (
        <div
          className="p-4 sm:p-6 rounded-sm"
          style={{ backgroundColor: "#f9ecdb", border: "1px solid rgba(199,0,23,0.2)" }}
        >
          <p className="pl-overline mb-1">{t("register_vehicle_desc")}</p>
          <h2 className="text-base font-semibold mb-5" style={{ color: "#211b10" }}>{t("register_vehicle")}</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="space-y-1.5 font-mono">
              <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5d3f3c" }}>{t("plate_number")}</Label>
              <Input id="plate" value={plateNumber} onChange={e => setPlateNumber(e.target.value)} required placeholder="e.g. DXB-12345" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5d3f3c" }}>{t("make_and_model")}</Label>
              <Input value={makeAndModel} onChange={e => setMakeAndModel(e.target.value)} placeholder="e.g. Toyota Hiace" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5d3f3c" }}>{t("vehicle_type")}</Label>
              <select value={type} onChange={e => setType(e.target.value as any)} className={selectCls}>
                <option value="Car">{t("type_car")}</option>
                <option value="Bus">{t("type_bus")}</option>
              </select>
            </div>
            <div className="space-y-1.5 font-mono">
              <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5d3f3c" }}>{t("initial_odometer")}</Label>
              <Input type="number" min="0" value={currentOdometer} onChange={e => setCurrentOdometer(Number(e.target.value))} required className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5d3f3c" }}>{t("status")}</Label>
              <select value={status} onChange={e => setStatus(e.target.value as any)} className={selectCls}>
                <option value="Active">{t("active")}</option>
                <option value="In Maintenance">{t("in_maintenance")}</option>
                <option value="Out of Service">{t("out_of_service")}</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-5 flex justify-end pt-2">
              <button type="submit" className="btn-precision">{t("save_vehicle")}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Desktop Table ── */}
      <div className="rounded-sm overflow-hidden hidden sm:block" style={{ backgroundColor: "#ffffff" }}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="table-head-precision">
              <th className="px-5 py-3 text-left">{t("plate_number")}</th>
              <th className="px-5 py-3 text-left hidden sm:table-cell">{t("make_and_model")}</th>
              <th className="px-5 py-3 text-left hidden md:table-cell">{t("vehicle_type")}</th>
              <th className="px-5 py-3 text-left hidden lg:table-cell">{t("odometer")}</th>
              <th className="px-5 py-3 text-left">{t("status")}</th>
              <th className="px-5 py-3 text-right">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {(loading && vehicles.length === 0) ? (
              <tr><td colSpan={6} className="text-center py-12"><Loader2 className="mx-auto h-5 w-5 animate-spin" style={{ color: "#c70017" }} /></td></tr>
            ) : (!loading && vehicles.length === 0) ? (
              <tr><td colSpan={6} className="text-center py-12 pl-overline">{t("no_vehicles")}</td></tr>
            ) : vehicles.map((v, i) => (
              <tr
                key={v.id}
                className="transition-colors group"
                style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fff8f2" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#fff2e0")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? "#ffffff" : "#fff8f2")}
              >
                <td className="px-5 py-4 font-bold text-sm whitespace-nowrap" style={{ color: "#211b10" }}>{v.plateNumber}</td>
                <td className="px-5 py-4 text-sm hidden sm:table-cell" style={{ color: "#5d3f3c" }}>{v.makeAndModel || "—"}</td>
                <td className="px-5 py-4 text-sm hidden md:table-cell" style={{ color: "#5d3f3c" }}>
                  {v.type === "Car" ? t("type_car") : t("type_bus")}
                </td>
                <td className="px-5 py-4 font-mono text-sm hidden lg:table-cell" style={{ color: "#5d3f3c" }}>
                  {v.currentOdometer.toLocaleString()} km
                </td>
                <td className="px-5 py-4">
                  <select
                    value={v.status}
                    onChange={e => handleStatusChange(v.id!, e.target.value)}
                    className="bg-transparent text-sm font-medium border-0 focus:outline-none cursor-pointer p-0"
                    style={{ color: "#211b10" }}
                  >
                    <option value="Active">● {t("active")}</option>
                    <option value="In Maintenance">● {t("in_maintenance")}</option>
                    <option value="Out of Service">● {t("out_of_service")}</option>
                  </select>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => handleEditOdometer(v.id!, v.currentOdometer)}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: "#5d3f3c" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#c70017")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#5d3f3c")}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(v.id!)}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: "#5d3f3c" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#c70017")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#5d3f3c")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Cards ── */}
      <div className="sm:hidden space-y-2">
        {(loading && vehicles.length === 0) ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "#c70017" }} /></div>
        ) : (!loading && vehicles.length === 0) ? (
          <div className="py-10 text-center pl-overline">{t("no_vehicles")}</div>
        ) : vehicles.map(v => (
          <div key={v.id} className="rounded-sm p-4" style={{ backgroundColor: "#ffffff" }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-base font-bold" style={{ color: "#211b10" }}>{v.plateNumber}</p>
                {v.makeAndModel && <p className="text-xs mt-0.5" style={{ color: "#5d3f3c" }}>{v.makeAndModel}</p>}
                <p className="text-[10px] uppercase font-bold tracking-widest mt-1" style={{ color: "#a8a29e" }}>
                  {v.type === "Car" ? t("type_car") : t("type_bus")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-bold" style={{ color: "#211b10" }}>{v.currentOdometer.toLocaleString()} km</p>
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => handleEditOdometer(v.id!, v.currentOdometer)} className="p-1" style={{ color: "#5d3f3c" }}><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(v.id!)} className="p-1" style={{ color: "#5d3f3c" }}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t" style={{ borderColor: "rgba(146,111,107,0.1)" }}>
              <select
                value={v.status}
                onChange={e => handleStatusChange(v.id!, e.target.value)}
                className="bg-transparent text-sm font-bold border-0 focus:outline-none cursor-pointer p-0 w-full"
                style={{ color: "#211b10" }}
              >
                <option value="Active">● {t("active")}</option>
                <option value="In Maintenance">● {t("in_maintenance")}</option>
                <option value="Out of Service">● {t("out_of_service")}</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
