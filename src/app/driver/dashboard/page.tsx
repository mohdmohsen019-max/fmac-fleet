"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getVehicles } from "@/lib/services/vehicleService";
import { logTrip } from "@/lib/services/tripService";
import { Vehicle } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export default function DriverDashboard() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [tripType, setTripType] = useState<"Internal" | "External">("Internal");
  const [startOdometer, setStartOdometer] = useState(0);
  const [endOdometer, setEndOdometer] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchActiveVehicles = async () => {
      try {
        const all = await getVehicles();
        setVehicles(all.filter(v => v.status === "Active"));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchActiveVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicle) {
      const v = vehicles.find(v => v.id === selectedVehicle);
      if (v) { setStartOdometer(v.currentOdometer); setEndOdometer(Math.max(endOdometer, v.currentOdometer)); }
    } else { setStartOdometer(0); setEndOdometer(0); }
  }, [selectedVehicle, vehicles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError("");
    if (endOdometer < startOdometer) { setError(t("error end odo")); return; }
    if (!selectedVehicle) { setError(t("error select vehicle")); return; }
    setSubmitting(true);
    try {
      const driverName = profile.displayName || profile.email || "Driver";
      await logTrip(profile.uid, driverName, selectedVehicle, tripType, startOdometer, endOdometer, notes);
      alert(t("trip success"));
      router.push("/driver/history");
    } catch (err: any) {
      setError(err.message || t("error end odo"));
    } finally { setSubmitting(false); }
  };

  const distance = Math.max(0, endOdometer - startOdometer);

  const inputCls = "flex h-10 w-full border px-4 py-2 text-sm bg-white rounded-[4px] focus:outline-none focus:border-[#c70017] transition-colors font-mono";
  const selectCls = "flex h-10 w-full border px-4 py-2 text-sm bg-white rounded-[4px] focus:outline-none focus:border-[#c70017] transition-colors cursor-pointer";
  const labelCls = "block text-xs font-bold uppercase tracking-wide mb-2";

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#c70017" }} /></div>;

  return (
    <div className="space-y-8">
      <div>
        <p className="pl-overline mb-1">{t("log new trip desc")}</p>
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "#211b10" }}>{t("log new trip")}</h1>
      </div>

      <div className="rounded-sm p-6 md:p-8" style={{ backgroundColor: "#ffffff", boxShadow: "0 0 24px -4px rgba(33,27,16,0.04)" }}>
        <p className="pl-overline mb-1">{t("form")}</p>
        <h2 className="text-base font-semibold mb-6" style={{ color: "#211b10" }}>{t("trip details")}</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelCls} style={{ color: "#5d3f3c" }}>{t("select vehicle")}</label>
            <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} required
              className={selectCls} style={{ borderColor: "rgba(146,111,107,0.25)" }}>
              <option value="" disabled>{t("select vehicle placeholder")}</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber} ({t(v.type.toLowerCase())})</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls} style={{ color: "#5d3f3c" }}>{t("trip type")}</label>
            <select value={tripType} onChange={e => setTripType(e.target.value as any)} required
              className={selectCls} style={{ borderColor: "rgba(146,111,107,0.25)" }}>
              <option value="Internal">{t("internal trip")}</option>
              <option value="External">{t("external trip")}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={{ color: "#5d3f3c" }}>{t("start odometer")}</label>
              <Input type="number" step="any" value={startOdometer} readOnly className={inputCls} style={{ borderColor: "rgba(146,111,107,0.15)", backgroundColor: "#fff8f2" }} />
            </div>
            <div>
              <label className={labelCls} style={{ color: "#5d3f3c" }}>{t("end odometer")}</label>
              <Input type="number" step="any" min={startOdometer} value={endOdometer} onChange={e => setEndOdometer(Number(e.target.value))} required
                className={inputCls} style={{ borderColor: "rgba(146,111,107,0.25)" }} />
            </div>
          </div>

          {/* Distance display */}
          <div className="flex items-center justify-between px-5 py-4 rounded-sm" style={{ backgroundColor: "#f9ecdb" }}>
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#5d3f3c" }}>{t("calculated distance")}</span>
            <span className="text-2xl font-semibold font-mono" style={{ color: "#211b10" }}>
              {parseFloat(distance.toFixed(2))} <span className="text-sm font-normal" style={{ color: "#5d3f3c" }}>{t("km")}</span>
            </span>
          </div>

          <div>
            <label className={labelCls} style={{ color: "#5d3f3c" }}>{t("notes optional")}</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder={t("notes placeholder")}
              className="w-full border px-4 py-3 text-sm bg-white rounded-[4px] focus:outline-none focus:border-[#c70017] transition-colors resize-none placeholder:text-[#a8a29e]"
              style={{ borderColor: "rgba(146,111,107,0.25)" }}
            />
          </div>

          {error && (
            <div className="text-sm px-4 py-3 rounded-[4px]" style={{ backgroundColor: "rgba(199,0,23,0.06)", color: "#c70017" }}>{error}</div>
          )}

          <button type="submit" disabled={submitting || !selectedVehicle} className="btn-precision w-full py-3 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 size={14} className="animate-spin" /> {t("submitting")}</> : t("submit trip")}
          </button>
        </form>
      </div>
    </div>
  );
}
