"use client";

import { useEffect, useState, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getScorecards, getViolations, addUniqueViolations, upsertScorecards } from "@/lib/services/behaviorService";
import { Scorecard, Violation } from "@/lib/schema";
import { 
  Loader2, 
  Upload, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Shield, 
  BarChart3,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Filter,
  PieChart as PieChartIcon,
  TrendingUp,
  Activity
} from "lucide-react";
import { format, startOfDay, subDays, eachDayOfInterval, isSameDay } from "date-fns";
import * as XLSX from "xlsx";
import { Timestamp } from "firebase/firestore";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";

const CHART_COLORS = ["#c70017", "#5d3f3c", "#a8a29e", "#211b10", "#f9ecdb", "#e5e7eb"];

export default function BehaviorPage() {
  const { t } = useLanguage();
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // Pagination State
  const [scorePage, setScorePage] = useState(0);
  const [scoreRowsPerPage, setScoreRowsPerPage] = useState(20);
  const [vPage, setVPage] = useState(0);
  const [vRowsPerPage, setVRowsPerPage] = useState(20);

  // Sorting & Filtering State
  const [scoreSort, setScoreSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'totalScore', dir: 'asc' }); // Default to low score (high risk) first
  const [vSort, setVSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' });
  const [vTypeFilter, setVTypeFilter] = useState("all");

  // Chart Toggle State
  const [violationChartType, setViolationChartType] = useState<"distribution" | "trend">("distribution");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, v] = await Promise.all([getScorecards(), getViolations()]);
      setScorecards(s);
      setViolations(v);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getRiskLevel = (score: number, vCount: number) => {
    if (score < 60 || vCount > 5) return "high";
    if (score >= 60 && score < 80) return "medium";
    return "low";
  };

  // Intelligence Data
  const vehicleStats = useMemo(() => scorecards.map(s => {
    const vCount = violations.filter(v => v.plate === s.plate).length;
    return {
      ...s,
      violationCount: vCount,
      risk: getRiskLevel(s.totalScore, vCount)
    };
  }), [scorecards, violations]);

  const fleetAvg = scorecards.length > 0 
    ? scorecards.reduce((acc, s) => acc + s.totalScore, 0) / scorecards.length 
    : 0;

  const highRiskCount = vehicleStats.filter(s => s.risk === "high").length;

  const mostFrequentViolation = violations.length > 0
    ? Object.entries(violations.reduce((acc, v) => {
        acc[v.type] = (acc[v.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0][0]
    : "—";

  // Chart Data Preparation
  const donutData = useMemo(() => {
    const counts = violations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [violations]);

  const barData = useMemo(() => {
    const last30 = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date()
    });
    return last30.map(day => ({
      date: format(day, "MMM dd"),
      count: violations.filter(v => isSameDay(v.date.toDate(), day)).length
    }));
  }, [violations]);

  const radarData = useMemo(() => {
    if (scorecards.length === 0) return [];
    const sum = scorecards.reduce((acc, s) => {
      acc.braking += s.braking;
      acc.acceleration += s.acceleration;
      acc.cornering += s.cornering;
      acc.speeding += s.speeding;
      return acc;
    }, { braking: 0, acceleration: 0, cornering: 0, speeding: 0 });
    
    const count = scorecards.length;
    return [
      { subject: t("braking"), A: sum.braking / count, fullMark: 100 },
      { subject: t("acceleration"), A: sum.acceleration / count, fullMark: 100 },
      { subject: t("cornering"), A: sum.cornering / count, fullMark: 100 },
      { subject: t("speeding"), A: sum.speeding / count, fullMark: 100 },
    ];
  }, [scorecards, t]);

  // Derived Filtered & Sorted Lists
  const violationTypes = useMemo(() => {
    return Array.from(new Set(violations.map(v => v.type))).sort();
  }, [violations]);

  const sortedScoreStats = useMemo(() => {
    const sorted = [...vehicleStats];
    sorted.sort((a: any, b: any) => {
      let valA = a[scoreSort.key];
      let valB = b[scoreSort.key];
      
      if (typeof valA === 'string') {
        return scoreSort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return scoreSort.dir === 'asc' ? valA - valB : valB - valA;
    });
    return sorted;
  }, [vehicleStats, scoreSort]);

  const processedViolations = useMemo(() => {
    let filtered = [...violations];
    if (vTypeFilter !== "all") {
      filtered = filtered.filter(v => v.type === vTypeFilter);
    }
    
    filtered.sort((a, b) => {
      if (vSort.key === 'date') {
        const timeA = a.date.toMillis();
        const timeB = b.date.toMillis();
        return vSort.dir === 'asc' ? timeA - timeB : timeB - timeA;
      }
      const valA = String((a as any)[vSort.key]);
      const valB = String((b as any)[vSort.key]);
      return vSort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    
    return filtered;
  }, [violations, vTypeFilter, vSort]);

  // CSV Logical Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "score" | "violation") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataArr = evt.target?.result;
        const wb = XLSX.read(dataArr, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawItems = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];

        const data = rawItems.map(item => {
          const normalized: any = {};
          Object.keys(item).forEach(key => { normalized[key.trim().toLowerCase()] = item[key]; });
          return normalized;
        });

        if (type === "score") {
          const formatted = data.map(row => ({
            plate: String(row.plate || row.vehicle_id || row.vehicle_name || "").trim(),
            kms: Number(row.kms || row.total_km || 0),
            braking: Number(row.braking || 0),
            acceleration: Number(row.acceleration || 0),
            cornering: Number(row.cornering || 0),
            speeding: Number(row.speeding || 0),
            totalScore: Number(row.score || row.total_score || 0)
          })).filter(it => it.plate !== "");
          if (formatted.length === 0) throw new Error("No valid data rows found.");
          await upsertScorecards(formatted);
        } else {
          const formatted = data.map(row => {
            const dateVal = row.date || row.timestamp || "";
            let dateObj: Date;
            if (typeof dateVal === 'number') {
              const utc_days = Math.floor(dateVal - 25569);
              dateObj = new Date(utc_days * 86400 * 1000);
            } else {
              dateObj = new Date(String(dateVal).trim());
            }
            if (isNaN(dateObj.getTime())) throw new Error(`Invalid date: ${dateVal}`);
            return {
              plate: String(row.plate || row.vehicle_id || row.vehicle_name || "").trim(),
              date: Timestamp.fromDate(dateObj),
              type: String(row.type || row.violation_type || "").trim()
            };
          }).filter(it => it.plate !== "");
          if (formatted.length === 0) throw new Error("No valid data rows found.");
          await addUniqueViolations(formatted);
        }
        await fetchData();
        alert(t("csv_upload_success"));
      } catch (err: any) {
        alert(`${t("csv_upload_failed")} ${err.message || ""}`);
      } finally {
        setUploading(false);
        setShowUpload(false);
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportTable = (type: "score" | "violation") => {
    const data = type === "score" 
      ? vehicleStats.map(s => ({ Plate: s.plate, KM: s.kms, Braking: s.braking, Accel: s.acceleration, Speed: s.speeding, Score: s.totalScore, Risk: s.risk }))
      : violations.map(v => ({ Plate: v.plate, Date: format(v.date.toDate(), "yyyy-MM-dd"), Type: v.type }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `fmac_${type}_export.csv`);
  };

  // Pagination Logic
  const paginatedScores = sortedScoreStats.slice(scorePage * scoreRowsPerPage, (scorePage + 1) * scoreRowsPerPage);
  const paginatedViolations = processedViolations.slice(vPage * vRowsPerPage, (vPage + 1) * vRowsPerPage);

  const handleSort = (table: 'score' | 'violation', key: string) => {
    if (table === 'score') {
      setScoreSort(prev => ({
        key,
        dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
      }));
      setScorePage(0);
    } else {
      setVSort(prev => ({
        key,
        dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
      }));
      setVPage(0);
    }
  };

  const SortIndicator = ({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) => {
    if (!active) return <ChevronsUpDown size={12} className="opacity-20" />;
    return dir === 'asc' ? <ChevronUp size={12} className="text-[#c70017]" /> : <ChevronDown size={12} className="text-[#c70017]" />;
  };

  const PaginationControl = ({ current, total, rowsPerPage, setRowsPerPage, setPage }: any) => {
    const totalPages = Math.ceil(total / rowsPerPage);
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 mt-6 px-1">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a8a29e" }}>{t("rows_per_page")}</span>
          <select 
            value={rowsPerPage} 
            onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
            className="bg-white border rounded-sm text-sm px-2 py-1 outline-none focus:border-[#c70017]"
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button 
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            className="p-2 rounded-sm border hover:bg-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-mono" style={{ color: "#5d3f3c" }}>
            {current + 1} / {totalPages || 1}
          </span>
          <button 
            disabled={current >= totalPages - 1}
            onClick={() => setPage(current + 1)}
            className="p-2 rounded-sm border hover:bg-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 pb-20">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="pl-overline mb-1">{t("behavior_desc")}</p>
          <h1 className="text-4xl font-semibold tracking-tight" style={{ color: "#211b10" }}>{t("fleet_behavior")}</h1>
        </div>
        <button onClick={() => setShowUpload(!showUpload)} className="btn-secondary flex items-center gap-1.5 self-start">
          {showUpload ? <X size={14} /> : <Upload size={14} />} {showUpload ? t("cancel") : t("upload_csv")}
        </button>
      </div>

      {showUpload && (
        <div className="p-8 rounded-sm grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4 duration-300" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(146,111,107,0.15)", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: "#c70017" }}><Activity size={16}/> {t("scoreboard")}</h3>
            <p className="text-xs leading-relaxed" style={{ color: "#a8a29e" }}>REQUIRED: plate/vehicle_name, kms, braking, acceleration, cornering, speeding, score</p>
            <input type="file" accept=".csv" onChange={e => handleFileUpload(e, "score")} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-sm file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:bg-[#f9ecdb] file:text-[#c70017] hover:file:bg-[#ede1cf] cursor-pointer" />
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: "#c70017" }}><AlertTriangle size={16}/> {t("violations")}</h3>
            <p className="text-xs leading-relaxed" style={{ color: "#a8a29e" }}>REQUIRED: plate/vehicle_id, date, type/violation_type</p>
            <input type="file" accept=".csv" onChange={e => handleFileUpload(e, "violation")} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-sm file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:bg-[#f9ecdb] file:text-[#c70017] hover:file:bg-[#ede1cf] cursor-pointer" />
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: t("high_risk_vehicles"), val: highRiskCount, color: highRiskCount > 0 ? "#c70017" : "#211b10", icon: <AlertTriangle size={16}/>, sub: "Immediate audit required" },
          { label: t("avg_fleet_score"), val: fleetAvg.toFixed(1), color: "#211b10", icon: <Activity size={16}/>, sub: "Fleet performance benchmark" },
          { label: t("most_frequent_violation"), val: mostFrequentViolation, color: "#211b10", icon: <Shield size={16}/>, sub: "Priority safety focus", small: true }
        ].map((kpi, i) => (
          <div key={i} className="p-6 rounded-sm bg-white border border-opacity-10 border-[#926f6b]">
            <p className="pl-overline mb-3">{kpi.label}</p>
            <span className={`${kpi.small ? 'text-xl' : 'text-4xl'} font-semibold tracking-tight`} style={{ color: kpi.color }}>{kpi.val}</span>
            <div className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#a8a29e" }}>
              {kpi.icon} {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Visual Intelligence Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Violation Intelligence */}
        <div className="bg-white p-8 rounded-sm border border-opacity-10 border-[#926f6b]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#211b10" }}>
              {violationChartType === "distribution" ? t("violation_distribution") : t("violation_trends")}
            </h2>
            <div className="flex gap-1 p-1 rounded-sm" style={{ backgroundColor: "#f9ecdb" }}>
              <button 
                onClick={() => setViolationChartType("distribution")}
                className={`p-1.5 rounded-sm transition-all ${violationChartType === "distribution" ? 'bg-white shadow-sm' : 'opacity-40'}`}
              >
                <PieChartIcon size={14} />
              </button>
              <button 
                onClick={() => setViolationChartType("trend")}
                className={`p-1.5 rounded-sm transition-all ${violationChartType === "trend" ? 'bg-white shadow-sm' : 'opacity-40'}`}
              >
                <TrendingUp size={14} />
              </button>
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {violationChartType === "distribution" ? (
                <PieChart>
                  <Pie 
                    data={donutData} 
                    innerRadius={60} 
                    outerRadius={100} 
                    paddingAngle={5} 
                    dataKey="value"
                    animationDuration={1000}
                  >
                    {donutData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" />
                </PieChart>
              ) : (
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="count" fill="#c70017" radius={[2, 2, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Radar */}
        <div className="bg-white p-8 rounded-sm border border-opacity-10 border-[#926f6b]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#211b10" }}>{t("performance_profile")}</h2>
            <BarChart3 size={16} style={{ color: "#a8a29e" }} />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="rgba(0,0,0,0.05)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700, fill: "#5d3f3c" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                <Radar
                  name={t("fleet_behavior")}
                  dataKey="A"
                  stroke="#c70017"
                  fill="#c70017"
                  fillOpacity={0.15}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Tables ── */}
      <section className="space-y-12">
        {/* Scoreboard Table */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#211b10" }}>{t("scoreboard")}</h2>
            <button onClick={() => exportTable("score")} className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 py-2 px-3 rounded-sm border hover:bg-white transition-colors" style={{ color: "#5d3f3c" }}>
              <Download size={12} /> {t("excel")}
            </button>
          </div>
          <div className="rounded-sm overflow-hidden hidden sm:block bg-white border border-opacity-10 border-[#926f6b]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="table-head-precision">
                  <th className="px-5 py-3 text-left cursor-pointer hover:bg-[#fff8f2] transition-colors group" onClick={() => handleSort('score', 'plate')}>
                    <div className="flex items-center gap-1.5">
                      {t("plate")} <SortIndicator active={scoreSort.key === 'plate'} dir={scoreSort.dir} />
                    </div>
                  </th>
                  <th className="px-5 py-2 text-right cursor-pointer hover:bg-[#fff8f2] transition-colors" onClick={() => handleSort('score', 'kms')}>
                    <div className="flex items-center justify-end gap-1.5">
                      {t("total_km")} <SortIndicator active={scoreSort.key === 'kms'} dir={scoreSort.dir} />
                    </div>
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] cursor-pointer hover:bg-[#fff8f2] transition-colors" onClick={() => handleSort('score', 'braking')}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{t("braking")}</span>
                      <SortIndicator active={scoreSort.key === 'braking'} dir={scoreSort.dir} />
                    </div>
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] cursor-pointer hover:bg-[#fff8f2] transition-colors" onClick={() => handleSort('score', 'acceleration')}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{t("acceleration")}</span>
                      <SortIndicator active={scoreSort.key === 'acceleration'} dir={scoreSort.dir} />
                    </div>
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] cursor-pointer hover:bg-[#fff8f2] transition-colors" onClick={() => handleSort('score', 'cornering')}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{t("cornering")}</span>
                      <SortIndicator active={scoreSort.key === 'cornering'} dir={scoreSort.dir} />
                    </div>
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] cursor-pointer hover:bg-[#fff8f2] transition-colors" onClick={() => handleSort('score', 'speeding')}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{t("speeding")}</span>
                      <SortIndicator active={scoreSort.key === 'speeding'} dir={scoreSort.dir} />
                    </div>
                  </th>
                  <th className="px-5 py-2 text-right cursor-pointer hover:bg-[#fff8f2] transition-colors" onClick={() => handleSort('score', 'totalScore')}>
                    <div className="flex items-center justify-end gap-1.5">
                      {t("score")} <SortIndicator active={scoreSort.key === 'totalScore'} dir={scoreSort.dir} />
                    </div>
                  </th>
                  <th className="px-5 py-2 text-center">{t("risk_level")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="py-20 text-center"><Loader2 className="animate-spin mx-auto w-6 h-6" style={{ color: "#c70017" }} /></td></tr>
                ) : paginatedScores.length === 0 ? (
                  <tr><td colSpan={8} className="py-20 text-center pl-overline">{t("no_vehicles")}</td></tr>
                ) : paginatedScores.map(s => (
                  <tr key={s.id || s.plate} className="transition-colors" style={{ backgroundColor: s.risk === "medium" ? "#fff8f2" : "#ffffff" }}>
                    <td className="px-5 py-4 text-sm font-bold" style={{ color: "#211b10" }}>{s.plate}</td>
                    <td className="px-5 py-4 text-sm text-right font-mono" style={{ color: "#5d3f3c" }}>{s.kms.toLocaleString()}</td>
                    <td className="px-3 py-4 text-sm text-center font-mono" style={{ color: "#5d3f3c" }}>{s.braking}</td>
                    <td className="px-3 py-4 text-sm text-center font-mono" style={{ color: "#5d3f3c" }}>{s.acceleration}</td>
                    <td className="px-3 py-4 text-sm text-center font-mono" style={{ color: "#5d3f3c" }}>{s.cornering}</td>
                    <td className="px-3 py-4 text-sm text-center font-mono" style={{ color: "#5d3f3c" }}>{s.speeding}</td>
                    <td className={`px-5 py-4 text-sm text-right font-bold ${s.totalScore < 60 ? "text-[#c70017]" : "text-[#211b10]"}`}>{s.totalScore}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center">
                        {s.risk === "high" ? <AlertTriangle size={18} className="text-[#c70017]" /> : s.risk === "medium" ? <Shield size={18} className="text-[#a8a29e]" /> : <CheckCircle size={18} className="text-green-600" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile Mobile Scores Redacted for space, keeping Desktop Logic same as before but paginated */}
          {!loading && paginatedScores.length > 0 && (
            <PaginationControl 
              current={scorePage} total={sortedScoreStats.length} 
              rowsPerPage={scoreRowsPerPage} setRowsPerPage={setScoreRowsPerPage} setPage={setScorePage} 
            />
          )}
        </div>

        {/* Violations Table */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#211b10" }}>{t("violations")}</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 group">
                <Filter size={14} className="text-[#a8a29e] group-hover:text-[#c70017] transition-colors" />
                <select 
                  value={vTypeFilter} 
                  onChange={e => { setVTypeFilter(e.target.value); setVPage(0); }}
                  className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none border-b border-transparent focus:border-[#c70017] cursor-pointer"
                  style={{ color: "#5d3f3c" }}
                >
                  <option value="all">{t("all_types") || "All Types"}</option>
                  {violationTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button onClick={() => exportTable("violation")} className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 py-2 px-3 rounded-sm border hover:bg-white transition-colors" style={{ color: "#5d3f3c" }}>
                <Download size={12} /> {t("excel")}
              </button>
            </div>
          </div>
          <div className="rounded-sm overflow-hidden bg-white border border-opacity-10 border-[#926f6b]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="table-head-precision">
                  <th className="px-5 py-3 text-left cursor-pointer hover:bg-[#fff8f2] transition-colors" onClick={() => handleSort('violation', 'plate')}>
                    <div className="flex items-center gap-1.5">
                      {t("plate")} <SortIndicator active={vSort.key === 'plate'} dir={vSort.dir} />
                    </div>
                  </th>
                  <th className="px-5 py-3 text-left cursor-pointer hover:bg-[#fff8f2] transition-colors" onClick={() => handleSort('violation', 'date')}>
                    <div className="flex items-center gap-1.5">
                      {t("date")} <SortIndicator active={vSort.key === 'date'} dir={vSort.dir} />
                    </div>
                  </th>
                  <th className="px-5 py-3 text-left cursor-pointer hover:bg-[#fff8f2] transition-colors" onClick={() => handleSort('violation', 'type')}>
                    <div className="flex items-center gap-1.5">
                      {t("violation_type")} <SortIndicator active={vSort.key === 'type'} dir={vSort.dir} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={3} className="py-20 text-center"><Loader2 className="animate-spin mx-auto w-6 h-6" style={{ color: "#c70017" }} /></td></tr>
                ) : paginatedViolations.length === 0 ? (
                  <tr><td colSpan={3} className="py-20 text-center pl-overline">{t("no_recent_activity")}</td></tr>
                ) : paginatedViolations.map((v, i) => (
                  <tr key={v.id || i} className="hover:bg-[#fff8f2] transition-colors">
                    <td className="px-5 py-4 text-sm font-bold" style={{ color: "#211b10" }}>{v.plate}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 font-mono">{format(v.date.toDate(), "MMM dd, yyyy")}</td>
                    <td className="px-5 py-4 text-sm" style={{ color: "#c70017" }}>{v.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && paginatedViolations.length > 0 && (
            <PaginationControl 
              current={vPage} total={processedViolations.length} 
              rowsPerPage={vRowsPerPage} setRowsPerPage={setVRowsPerPage} setPage={setVPage} 
            />
          )}
        </div>
      </section>
    </div>
  );
}
