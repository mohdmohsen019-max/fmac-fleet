"use client";

import { useEffect, useState, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { 
  getScorecards, 
  getViolations, 
  upsertScorecards, 
  normalizePlate
} from "@/lib/services/behaviorService";
import { Scorecard, Violation, Vehicle } from "@/lib/schema";
import { deleteVehicle } from "@/lib/services/vehicleService";
import { db } from "@/lib/firebase";
import { doc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { 
  Loader2, 
  Upload, 
  Download, 
  AlertTriangle, 
  Shield, 
  Filter,
  Info,
  Calendar,
  X,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Activity,
  History,
  Zap
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis
} from "recharts";

const CHART_COLORS = ["#c70017", "#f59e0b", "#10b981", "#3b82f6", "#6366f1"];
const RISK_COLORS = {
  high: "#c70017",
  medium: "#f59e0b",
  low: "#10b981"
};

// Calibrated Fleet Baselines
const BASELINES = {
  AV_ALERTS_KM: 0.45,
  HI_ALERTS_KM: 0.70,
  HI_SPEEDING: 12,
  HI_BEHAVIOR: 8,
  HI_IDLE: 0.20
};

const timeToSeconds = (timeStr: string) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length !== 3) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
};

// Robust Number Parser for Excel Format (handles spaces and commas)
const cleanNum = (val: any): number => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/\s/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export default function BehaviorPage() {
  const { t } = useLanguage();
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [cleaning, setCleaning] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'riskScore', dir: 'desc' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { getVehicles } = await import("@/lib/services/vehicleService");
      const [s, vels] = await Promise.all([getScorecards(), getVehicles()]);
      setScorecards(s);
      setVehicles(vels);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const dashboardData = useMemo(() => {
    if (scorecards.length === 0) return [];

    const fleetRaw = scorecards.map(s => {
      const sBraking = s.braking || 0;
      const sAccel = s.acceleration || 0;
      const sCornering = s.cornering || 0;
      const sS100 = s.speed100 || 0;
      const sS120 = s.speed120 || 0;
      const sS140 = s.speed140 || 0;
      const sTrips = s.trips || 0;
      const sKms = s.kms || 0;
      const sDuration = s.totalDuration || "00:00:00";
      const sIdleTime = s.idlingTime || "00:00:00";
      const sAfterHours = s.afterHoursTrips || 0;

      const totalAlerts = sBraking + sAccel + sCornering + sS100 + sS120 + sS140;
      const alertsPerKm = sKms > 0 ? totalAlerts / sKms : 0;
      
      return { ...s, totalAlerts, alertsPerKm, sBraking, sAccel, sCornering, sS100, sS120, sS140, sTrips, sKms, sDuration, sIdleTime, sAfterHours };
    });

    // Real Fleet Average Calculation for Multiplier
    const fleetAvgAlertsPerKm = fleetRaw.reduce((acc, d) => acc + d.alertsPerKm, 0) / fleetRaw.length;

    const processed = fleetRaw.map(d => {
      const vels = vehicles.find(v => normalizePlate(v.plateNumber) === d.plate);
      
      // Normalized Metrics (0-1) - Using High Risk Ceiling for Normalization
      const normAlerts = Math.min(d.alertsPerKm / BASELINES.HI_ALERTS_KM, 1);
      
      const behaviorRate = d.sTrips > 0 ? (d.sBraking + d.sAccel + d.sCornering) / d.sTrips : 0;
      const normBehavior = Math.min(behaviorRate / BASELINES.HI_BEHAVIOR, 1);
      
      const speedingIndex = d.sTrips > 0 ? (d.sS100 * 2 + d.sS120 * 3 + d.sS140 * 5) / d.sTrips : 0;
      const normSpeeding = Math.min(speedingIndex / BASELINES.HI_SPEEDING, 1);
      
      const idleSec = timeToSeconds(d.sIdleTime);
      const totalDurSec = timeToSeconds(d.sDuration);
      const idleRatio = totalDurSec > 0 ? idleSec / totalDurSec : 0;
      const normIdle = Math.min(idleRatio / BASELINES.HI_IDLE, 1);

      // Revised Balanced Scoring (40/25/20/15)
      const riskScore = (
        normAlerts * 40 +
        normSpeeding * 25 +
        normBehavior * 20 +
        normIdle * 15
      );

      // Relative Risk Multiplier vs Calculated Fleet Average
      const relativeRisk = fleetAvgAlertsPerKm > 0 ? d.alertsPerKm / fleetAvgAlertsPerKm : 1;

      return {
        ...d,
        vehicleName: vels?.makeAndModel || "Unknown",
        busId: vels?.busNumber || "N/A",
        behaviorRate: Math.min(1, behaviorRate / BASELINES.HI_BEHAVIOR), 
        speedingIndex,
        idleRatio,
        riskScore,
        relativeRisk
      };
    });

    // Automated Prediction Rule: >60% HIGH risk boosts threshold by 20%
    const currentHighCount = processed.filter(d => d.riskScore >= 75).length;
    const isOverSaturated = processed.length > 0 && currentHighCount / processed.length > 0.6;
    
    // Dynamic Tiers
    const HI_THRESHOLD = isOverSaturated ? 75 * 1.2 : 75;
    const MD_THRESHOLD = isOverSaturated ? 45 * 1.2 : 45;

    return processed.map(d => ({
      ...d,
      riskLevel: d.riskScore >= HI_THRESHOLD ? 'high' : d.riskScore >= MD_THRESHOLD ? 'medium' : 'low'
    })).filter(d => {
      const matchesSearch = d.plate.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           d.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           d.busId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRisk = riskFilter === "all" || d.riskLevel === riskFilter;
      return matchesSearch && matchesRisk;
    }).sort((a: any, b: any) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (typeof valA === 'string') {
        return sortConfig.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortConfig.dir === 'asc' ? valA - valB : valB - valA;
    });
  }, [scorecards, vehicles, searchTerm, riskFilter, sortConfig]);

  const stats = useMemo(() => {
    if (dashboardData.length === 0) return { total: 0, highRisk: 0, totalKm: 0, totalAlts: 0, avgAlertsPerKm: 0 };
    const total = dashboardData.length;
    const highRisk = dashboardData.filter(d => d.riskLevel === "high").length;
    const totalKm = dashboardData.reduce((acc, d) => acc + d.sKms, 0);
    const totalAlts = dashboardData.reduce((acc, d) => acc + (d.totalAlerts || 0), 0);
    const avgAlertsPerKm = totalKm > 0 ? totalAlts / totalKm : 0;

    return { total, highRisk, totalKm, totalAlts, avgAlertsPerKm };
  }, [dashboardData]);

  // Chart Data
  const riskDistData = useMemo(() => {
    const counts = dashboardData.reduce((acc, d) => {
      acc[d.riskLevel] = (acc[d.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return [
      { name: 'High Risk', value: counts.high || 0, color: RISK_COLORS.high },
      { name: 'Medium Risk', value: counts.medium || 0, color: RISK_COLORS.medium },
      { name: 'Low Risk', value: counts.low || 0, color: RISK_COLORS.low }
    ];
  }, [dashboardData]);

  const benchmarkData = useMemo(() => {
    const avg = stats.avgAlertsPerKm;
    return dashboardData.slice(0, 10).map(d => ({
      name: d.plate,
      vehicle: d.alertsPerKm,
      fleet: avg
    }));
  }, [dashboardData, stats.avgAlertsPerKm]);

  const topBottomData = useMemo(() => {
    const sorted = [...dashboardData].sort((a, b) => b.riskScore - a.riskScore);
    const top = sorted.slice(0, 5);
    const bottom = sorted.slice(-5).reverse();
    return { top, bottom };
  }, [dashboardData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataArr = evt.target?.result;
        const wb = XLSX.read(dataArr, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawItems = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        // Smart dynamic row scanning: skips headers and finds rows starting with valid registration
        const scoreData: Omit<Scorecard, "id" | "updatedAt">[] = [];

        rawItems.forEach(row => {
          const plateStr = String(row[0] || "").trim();
          // Filter to only include rows that look like a valid registration (e.g. FUJ-...)
          if (!plateStr || !plateStr.toUpperCase().startsWith("FUJ-")) return;
          
          scoreData.push({
            plate: plateStr,
            trips: cleanNum(row[2]),
            afterHoursTrips: cleanNum(row[3]),
            braking: cleanNum(row[4]),
            acceleration: cleanNum(row[6]),
            cornering: cleanNum(row[7]),
            idlingCount: cleanNum(row[8]),
            idlingTime: String(row[9] || "00:00:00"),
            speed80: cleanNum(row[10]),
            speed100: cleanNum(row[11]),
            speed120: cleanNum(row[12]),
            speed140: cleanNum(row[13]),
            avgSpeed: cleanNum(row[14]),
            totalDuration: String(row[22] || "00:00:00"),
            kms: cleanNum(row[23])
          });
        });

        if (scoreData.length === 0) throw new Error("No valid data rows starting with 'FUJ-' were found.");
        await upsertScorecards(scoreData);
        await fetchData();
        alert(`Recalibrated Risk data for ${scoreData.length} vehicles imported successfully!`);
      } catch (err: any) {
        alert(`Import failed: ${err.message}`);
      } finally {
        setUploading(false);
        setShowUpload(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleResetFleet = async () => {
    if (!confirm("☢️ NUCLEAR RESET: This will PERMANENTLY DELETE all vehicles, scorecards, and violations from the database. This action cannot be undone. Proceed?")) return;
    
    setCleaning(true);
    try {
      const velsSnap = await getDocs(collection(db, "vehicles"));
      const scoreSnap = await getDocs(collection(db, "scorecards"));
      const violationSnap = await getDocs(collection(db, "violations"));

      const deletions = [
        ...velsSnap.docs.map(d => deleteDoc(doc(db, "vehicles", d.id))),
        ...scoreSnap.docs.map(d => deleteDoc(doc(db, "scorecards", d.id))),
        ...violationSnap.docs.map(d => deleteDoc(doc(db, "violations", d.id)))
      ];

      await Promise.all(deletions);

      alert(`Database wiped. Reset ${deletions.length} records. You can now import fresh data.`);
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Reset failed. See console.");
    } finally {
      setCleaning(false);
    }
  };

  const exportData = () => {
    const data = dashboardData.map(d => ({
      "Vehicle ID": d.plate,
      "vs Fleet Avg": d.relativeRisk.toFixed(1) + "x",
      "Risk Score": Math.round(d.riskScore),
      "Risk Level": d.riskLevel.toUpperCase(),
      "Alerts/KM": d.alertsPerKm.toFixed(3),
      "Behavior Rate": (d.behaviorRate * 100).toFixed(1) + "%",
      "Speeding Index": d.speedingIndex.toFixed(2),
      "Total KM": d.sKms
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Risk Assessment");
    XLSX.writeFile(wb, `fmac_recalibrated_risk_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="pl-overline mb-1">Precise Operational Baseline Assessment</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[#211b10]">Fleet Risk Intelligence Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleResetFleet} 
            disabled={cleaning}
            className="btn-secondary text-[#c70017] border-[#c70017]/20 hover:bg-[#c70017]/5 flex items-center gap-2"
          >
             {cleaning ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />} Reset & Clear Data
          </button>
          <button onClick={() => setShowUpload(!showUpload)} className="btn-secondary flex items-center gap-2">
             {showUpload ? <X size={16} /> : <Upload size={16} />} {showUpload ? "Cancel" : "Import Operational Data"}
          </button>
          <button onClick={exportData} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Export Detailed Risk
          </button>
        </div>
      </div>

      {showUpload && (
        <div className="p-8 rounded-sm bg-white border border-[#926f6b]/20 shadow-xl animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-sm bg-[#f9ecdb]">
              <Zap size={24} className="text-[#c70017]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Recalibrated Data Ingestion</h3>
              <p className="text-sm text-[#5d3f3c]">Upload the report to calculate normalized risk scores and relative benchmarks.</p>
            </div>
          </div>
          <div className="border-2 border-dashed border-[#926f6b]/20 rounded-sm p-10 text-center hover:border-[#c70017]/40 transition-colors">
            <input type="file" accept=".xls,.xlsx" onChange={handleFileUpload} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload size={32} className="mx-auto mb-4 text-[#a8a29e]" />
              <p className="text-sm font-semibold text-[#211b10]">Click to select the report file</p>
              <p className="text-xs text-[#a8a29e] mt-1">Normalizes metrics to 0-1 range based on industry benchmarks.</p>
            </label>
          </div>
          {uploading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-[#c70017]">
               <Loader2 size={16} className="animate-spin" /> Normalizing fleet intelligence...
            </div>
          )}
        </div>
      )}

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Fleet KM Tracking", val: stats.totalKm.toFixed(0), sub: "Operational Range", icon: <Activity size={18} /> },
          { label: "Fleet Intensity Index", val: stats.avgAlertsPerKm.toFixed(3), sub: "Industry Baseline: 0.450", icon: <TrendingUp size={18} /> },
          { label: "Active Risk Units", val: stats.highRisk, sub: "Threshold: 75+", icon: <Shield size={18} />, highlight: stats.highRisk > 0 },
          { label: "Operational Vehicles", val: stats.total, sub: "Data Integrity", icon: <Zap size={18} /> }
        ].map((kpi, i) => (
          <div key={i} className={`p-6 rounded-sm bg-white border ${kpi.highlight ? 'border-[#c70017]/30 ring-1 ring-[#c70017]/10' : 'border-[#926f6b]/10'}`}>
            <p className="pl-overline mb-2 text-[#a8a29e]">{kpi.label}</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-semibold tracking-tight ${kpi.highlight ? 'text-[#c70017]' : 'text-[#211b10]'}`}>{kpi.val}</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-4 flex items-center gap-2 text-[#a8a29e]">
              {kpi.icon} {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Visual Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Risk Score Histogram */}
        <div className="bg-white p-6 border border-[#926f6b]/10 rounded-sm h-[350px] flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-tighter text-[#a8a29e] mb-6 flex items-center gap-2">
            <PieIcon size={14} /> Risk Distribution Spread
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={riskDistData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {riskDistData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ReTooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts/km vs Average */}
        <div className="bg-white p-6 border border-[#926f6b]/10 rounded-sm h-[350px] flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-tighter text-[#a8a29e] mb-6 flex items-center gap-2">
            <BarChart3 size={14} /> Intensity vs Fleet Average
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={benchmarkData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <ReTooltip cursor={{ fill: '#f9ecdb' }} />
              <Legend />
              <Bar dataKey="vehicle" name="Vehicle Alerts/KM" fill="#c70017" barSize={15} />
              <Bar dataKey="fleet" name="Fleet Average" fill="#a8a29e" barSize={15} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Risk Vehicles */}
        <div className="bg-white p-6 border border-[#926f6b]/10 rounded-sm h-[350px] flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-tighter text-[#a8a29e] mb-6 flex items-center gap-2 text-[#c70017]">
            <TrendingUp size={14} /> Top 5 Risk Offenders
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topBottomData.top} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f5" />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis dataKey="plate" type="category" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
              <ReTooltip cursor={{ fill: '#c7001710' }} />
              <Bar dataKey="riskScore" fill="#c70017" radius={[0, 4, 4, 0]} barSize={15} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Risk Vehicles */}
        <div className="bg-white p-6 border border-[#926f6b]/10 rounded-sm h-[350px] flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-tighter text-[#a8a29e] mb-6 flex items-center gap-2 text-[#10b981]">
            <Shield size={14} /> Top 5 Safety Leaders
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topBottomData.bottom} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f5" />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis dataKey="plate" type="category" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
              <ReTooltip cursor={{ fill: '#10b98110' }} />
              <Bar dataKey="riskScore" fill="#10b981" radius={[0, 4, 4, 0]} barSize={15} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Decision Table */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 px-6 py-4 rounded-sm bg-white border border-[#926f6b]/10">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]" size={16} />
            <input 
              type="text" 
              placeholder="Filter fleet..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#f9ecdb]/20 border border-transparent focus:border-[#c70017]/20 rounded-sm outline-none text-sm"
            />
          </div>
          <select 
              value={riskFilter} 
              onChange={e => setRiskFilter(e.target.value)}
              className="bg-transparent text-xs font-black uppercase outline-none cursor-pointer text-[#a8a29e]"
            >
              <option value="all">Global Fleet</option>
              <option value="high">🔴 High Focus</option>
              <option value="medium">🟡 Watchlist</option>
              <option value="low">⚪ Baseline</option>
          </select>
        </div>

        <div className="rounded-sm overflow-hidden bg-white border border-[#926f6b]/10 shadow-sm">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f9ecdb]">
                  {[
                    { label: "Vehicle / Plate", key: "plate", align: "left" },
                    { label: "vs Fleet Avg", key: "relativeRisk", align: "center", highlight: true },
                    { label: "Risk Score", key: "riskScore", align: "right" },
                    { label: "Status", key: "riskLevel", align: "center" },
                    { label: "Alerts/km", key: "alertsPerKm", align: "right" },
                    { label: "Behavior", key: "behaviorRate", align: "center" },
                    { label: "Speed Index", key: "speedingIndex", align: "center" },
                    { label: "Idle Ratio", key: "idleRatio", align: "center" },
                    { label: "KM", key: "sKms", align: "right" }
                  ].map((col, i) => (
                    <th 
                      key={i} 
                      className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest cursor-pointer hover:bg-[#ede1cf]"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className={`flex items-center gap-1 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-start'} ${col.highlight ? 'text-[#c70017]' : ''}`}>
                         {col.label}
                         {sortConfig.key === col.key ? (
                           sortConfig.dir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                         ) : (
                           <ChevronsUpDown size={10} className="text-[#a8a29e]/30" />
                         )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#926f6b]/5 text-sm">
                {loading ? (
                  <tr><td colSpan={9} className="py-24 text-center text-[#a8a29e]">Syncing Recalibrated Analysis...</td></tr>
                ) : dashboardData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-24 text-center">
                       <p className="text-lg font-semibold text-[#5d3f3c]">Operational Database Empty</p>
                       <p className="text-sm text-[#a8a29e]">Import a the Risk Report to generate insights.</p>
                    </td>
                  </tr>
                ) : (
                  dashboardData.map((d, i) => (
                    <tr key={i} className="hover:bg-[#fff8f2] transition-colors group cursor-default">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#211b10]">{d.plate}</span>
                          <span className="text-[10px] text-[#a8a29e] font-medium">{d.vehicleName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${d.relativeRisk > 1.2 ? 'bg-[#c70017]/10 text-[#c70017]' : d.relativeRisk < 0.8 ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>
                          {d.relativeRisk.toFixed(1)}x {d.relativeRisk > 1 ? "Worse" : "Better"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`text-lg font-black tracking-tighter ${d.riskScore >= 75 ? 'text-[#c70017]' : 'text-[#211b10]'}`}>
                          {Math.round(d.riskScore)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <div className={`w-2 h-2 rounded-full shadow-inner animate-pulse`} style={{ backgroundColor: (RISK_COLORS as any)[d.riskLevel] }} />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs">
                        {d.alertsPerKm.toFixed(3)}
                      </td>
                      <td className="px-4 py-4 text-center">
                         <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-mono">{(d.behaviorRate * 100).toFixed(0)}%</span>
                            <div className="w-10 h-0.5 bg-gray-100 rounded-full overflow-hidden">
                               <div className="h-full bg-[#5d3f3c]" style={{ width: `${d.behaviorRate * 100}%` }} />
                            </div>
                         </div>
                      </td>
                      <td className="px-4 py-4 text-center font-mono text-xs">
                        {d.speedingIndex.toFixed(1)}
                      </td>
                      <td className="px-4 py-4 text-center font-mono text-xs">
                        {(d.idleRatio * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs">
                        {Math.round(d.sKms).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
