"use client";

import { useEffect, useState } from "react";
import { getVehicles } from "@/lib/services/vehicleService";
import { getAllTrips } from "@/lib/services/tripService";
import { getAllMaintenance } from "@/lib/services/maintenanceService";
import { Vehicle, Trip, MaintenanceLog } from "@/lib/schema";
import { Loader2 } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, subDays, isAfter } from "date-fns";
import { useLanguage } from "@/context/LanguageContext";

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [v, tr, m] = await Promise.all([getVehicles(), getAllTrips(), getAllMaintenance()]);
        setVehicles(v); setTrips(tr); setMaintenance(m);
      } catch (err) { console.error("Dashboard fetch error:", err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#c70017" }} />
      </div>
    );
  }

  const vehiclesNeedingService = vehicles.filter(v => v.status === "In Maintenance").length;
  const outOfService = vehicles.filter(v => v.status === "Out of Service").length;
  const activeVehicles = vehicles.length - vehiclesNeedingService - outOfService;

  const last7DaysTrips = trips.filter(t => isAfter((t.date as any).toDate(), subDays(new Date(), 7)));
  const totalDistance7D = last7DaysTrips.reduce((acc, trip) => acc + trip.distance, 0);

  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dayStr = format(d, "MMM dd");
    const dist = trips
      .filter(t => format((t.date as any).toDate(), "MMM dd") === dayStr)
      .reduce((acc, t) => acc + t.distance, 0);
    return { name: t(format(d, "eee").toLowerCase()), distance: dist };
  });

  const recentActivity = [...trips, ...maintenance]
    .sort((a, b) => (b.createdAt as any).seconds - (a.createdAt as any).seconds)
    .slice(0, 6);

  return (
    <div className="space-y-12">

      {/* ── KPI Strip ── */}
      <header>
        <p className="pl-overline mb-4">{t("overview")}</p>

        {/* 2-up on mobile → single row on lg */}
        <div className="grid grid-cols-2 lg:flex lg:items-end gap-4 lg:gap-x-14">

          <div className="flex flex-col p-4 lg:p-0 rounded-sm lg:rounded-none" style={{ backgroundColor: "rgba(0,0,0,0.02)" }}>
            <span className="text-4xl font-semibold leading-none tracking-tight" style={{ color: "#211b10" }}>
              {vehicles.length}
            </span>
            <span className="pl-overline mt-2">{t("total vehicles")}</span>
          </div>

          <div className="flex flex-col p-4 lg:p-0 rounded-sm lg:rounded-none" style={{ backgroundColor: "rgba(0,0,0,0.02)" }}>
            <span className="text-4xl font-semibold leading-none tracking-tight" style={{ color: "#16a34a" }}>
              {activeVehicles}
            </span>
            <span className="pl-overline mt-2">{t("vehicles active")}</span>
          </div>

          <div className="flex flex-col p-4 lg:p-0 rounded-sm lg:rounded-none" style={{ backgroundColor: "rgba(0,0,0,0.02)" }}>
            <div className="flex items-center gap-2">
              <span className="text-4xl font-semibold leading-none tracking-tight" style={{ color: vehiclesNeedingService > 0 ? "#c70017" : "#211b10" }}>
                {vehiclesNeedingService}
              </span>
              {vehiclesNeedingService > 0 && (
                <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: "#c70017" }} />
              )}
            </div>
            <span className="pl-overline mt-2">{t("in maintenance count")}</span>
          </div>

          <div className="flex flex-col p-4 lg:p-0 rounded-sm lg:rounded-none" style={{ backgroundColor: "rgba(0,0,0,0.02)" }}>
            <span className="text-4xl font-semibold leading-none tracking-tight" style={{ color: "#211b10" }}>
              {totalDistance7D.toLocaleString()}
              <span className="text-lg font-medium ms-1" style={{ color: "#5d3f3c" }}>km</span>
            </span>
            <span className="pl-overline mt-2">{t("distance 7d")}</span>
          </div>

        </div>
      </header>


      {/* ── Charts + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Mileage Trend */}
        <section className="lg:col-span-8 rounded-sm p-6 md:p-8" style={{ backgroundColor: "#ffffff" }}>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#211b10" }}>
              {t("mileage trend")}
            </h2>
            <div className="flex gap-4">
              <span className="text-[0.6875rem] font-bold" style={{ color: "#c70017" }}>● {t("distance 7d")}</span>
            </div>
          </div>
          <div className="h-52 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 0, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c70017" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#c70017" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(231,189,184,0.3)" strokeDasharray="0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#a8a29e", fontWeight: 600, letterSpacing: "0.06em" }}
                  tickLine={false} axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#a8a29e" }}
                  tickLine={false} axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(146,111,107,0.15)",
                    borderRadius: "4px",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(33,27,16,0.06)",
                  }}
                  labelStyle={{ fontWeight: 700, color: "#211b10" }}
                />
                <Area
                  type="monotone"
                  dataKey="distance"
                  stroke="#c70017"
                  strokeWidth={1.5}
                  fill="url(#colorDist)"
                  dot={{ fill: "#ffffff", stroke: "#c70017", strokeWidth: 1.5, r: 3 }}
                  activeDot={{ r: 5, fill: "#c70017", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="lg:col-span-4 rounded-sm p-6" style={{ backgroundColor: "#f9ecdb" }}>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: "#211b10" }}>
            {t("recent activity")}
          </h2>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm" style={{ color: "#5d3f3c" }}>{t("no recent activity")}</p>
            ) : recentActivity.map((item) => {
              const isTrip = "distance" in item;
              const v = vehicles.find(v => v.id === item.vehicleId);
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <div
                    className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isTrip ? "#004b8c" : "#c70017" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none truncate" style={{ color: "#211b10" }}>
                      {isTrip ? `${t("trip logged")} — ${(item as Trip).distance} ${t("km")}` : t("maintenance recorded")}
                    </p>
                    <p className="text-[0.6875rem] mt-1 font-mono" style={{ color: "#5d3f3c" }}>
                      {v ? v.plateNumber : t("unknown vehicle")} · {format((item.createdAt as any).toDate(), "MMM dd, HH:mm")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── Fleet Utilization strip ── */}
      <section>
        <p className="pl-overline mb-6">{t("fleet vehicles")}</p>
        <div className="grid grid-cols-3 gap-3 md:gap-6">
          {[
            { label: t("active"), value: activeVehicles, total: vehicles.length, color: "#16a34a" },
            { label: t("in maintenance count"), value: vehiclesNeedingService, total: vehicles.length, color: "#c70017" },
            { label: t("out of service count"), value: outOfService, total: vehicles.length, color: "#a8a29e" },
          ].map(({ label, value, total, color }) => (
            <div key={label} className="p-4 md:p-6 rounded-sm" style={{ backgroundColor: "#f9ecdb" }}>
              <p className="pl-overline truncate">{label}</p>
              <p className="text-3xl md:text-4xl font-semibold mt-2 leading-none" style={{ color }}>{value}</p>
              <div className="mt-3 h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: "#ede1cf" }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    backgroundColor: color,
                    width: total > 0 ? `${Math.round((value / total) * 100)}%` : "0%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
