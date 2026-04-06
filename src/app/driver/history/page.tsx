"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTripsByDriver } from "@/lib/services/tripService";
import { Trip } from "@/lib/schema";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/context/LanguageContext";

export default function DriverHistoryPage() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      if (!profile) return;
      try { setTrips(await getTripsByDriver(profile.uid)); }
      catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchTrips();
  }, [profile]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#c70017" }} /></div>;

  return (
    <div className="space-y-8">
      <div>
        <p className="pl-overline mb-1">{t("trip history desc")}</p>
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "#211b10" }}>{t("trip history")}</h1>
      </div>

      {trips.length === 0 ? (
        <div className="py-14 text-center rounded-sm" style={{ border: "1px dashed rgba(146,111,107,0.3)" }}>
          <p className="pl-overline">{t("no trips")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="rounded-sm overflow-hidden hidden sm:block" style={{ backgroundColor: "#ffffff" }}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="table-head-precision">
                  <th className="px-5 py-3 text-left">{t("date")}</th>
                  <th className="px-5 py-3 text-left">{t("trip type")}</th>
                  <th className="px-5 py-3 text-right hidden sm:table-cell">{t("start odo")}</th>
                  <th className="px-5 py-3 text-right hidden lg:table-cell">{t("end odo")}</th>
                  <th className="px-5 py-3 text-right">{t("distance")}</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip, i) => (
                  <tr
                    key={trip.id}
                    className="transition-colors"
                    style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fff8f2" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#fff2e0")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? "#ffffff" : "#fff8f2")}
                  >
                    <td className="px-5 py-4 text-sm font-mono whitespace-nowrap" style={{ color: "#5d3f3c" }}>
                      {format(trip.date.toDate(), "MMM dd, yyyy")}
                    </td>
                    <th className="px-5 py-4">
                      <span className="fleet-chip" style={{
                        backgroundColor: trip.tripType === "Internal" ? "rgba(0,75,140,0.08)" : "#ede1cf",
                        color: trip.tripType === "Internal" ? "#004b8c" : "#5d3f3c",
                      }}>
                        {trip.tripType}
                      </span>
                    </th>
                    <td className="px-5 py-4 text-sm font-mono text-right hidden sm:table-cell" style={{ color: "#5d3f3c" }}>
                      {trip.startOdometer.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-sm font-mono text-right hidden lg:table-cell" style={{ color: "#5d3f3c" }}>
                      {trip.endOdometer.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-sm font-mono font-semibold text-right" style={{ color: "#211b10" }}>
                      {trip.distance} km
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            {trips.map(trip => (
              <div key={trip.id} className="rounded-sm p-4" style={{ backgroundColor: "#ffffff" }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs font-mono" style={{ color: "#a8a29e" }}>
                      {format(trip.date.toDate(), "MMM dd, yyyy")}
                    </p>
                    <span className="fleet-chip mt-2" style={{
                      backgroundColor: trip.tripType === "Internal" ? "rgba(0,75,140,0.08)" : "#ede1cf",
                      color: trip.tripType === "Internal" ? "#004b8c" : "#5d3f3c",
                    }}>
                      {trip.tripType}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold font-mono" style={{ color: "#c70017" }}>{trip.distance} km</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest mt-1" style={{ color: "#a8a29e" }}>
                      {trip.startOdometer.toLocaleString()} → {trip.endOdometer.toLocaleString()}
                    </p>
                  </div>
                </div>
                {trip.notes && (
                  <div className="pt-3 mt-3 border-t italic text-xs" style={{ color: "#5d3f3c", borderColor: "rgba(146,111,107,0.1)" }}>
                    {trip.notes}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Notes Summary (Only if needed) */}
          {trips.some(t => t.notes) && (
            <div className="hidden sm:block px-5 py-4 rounded-sm" style={{ borderTop: "1px solid rgba(146,111,107,0.1)", backgroundColor: "#ffffff" }}>
              <p className="pl-overline mb-3">Notes</p>
              {trips.filter(t => t.notes).map(trip => (
                <div key={trip.id} className="mb-2 text-sm" style={{ color: "#5d3f3c" }}>
                  <span className="font-semibold" style={{ color: "#211b10" }}>{format(trip.date.toDate(), "MMM dd")}:</span> {trip.notes}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
