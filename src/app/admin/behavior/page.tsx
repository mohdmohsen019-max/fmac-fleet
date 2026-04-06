"use client";

import { useEffect, useState, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { 
  uploadViolationsBatch, 
  getViolationsByRange,
  resetAIBehaviorData
} from "@/lib/services/violationService";
import { Violation, Vehicle } from "@/lib/schema";
import { getVehicles } from "@/lib/services/vehicleService";
import { normalizePlate } from "@/lib/services/behaviorService";
import { 
  Loader2, 
  Upload, 
  Download, 
  AlertTriangle, 
  Shield, 
  Calendar,
  Search,
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Activity,
  History,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Filter,
  X
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import * as XLSX from "xlsx";
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

const CHART_COLORS = ["#c70017", "#f59e0b", "#10b981", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899"];

const IndicatorCard = ({ title, value, subValue, trend, trendValue, icon, hint }: any) => (
  <div className="p-6 rounded-sm bg-white border border-[#926f6b]/10 hover:border-[#c70017]/20 transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 rounded-sm bg-[#f9ecdb] text-[#c70017] group-hover:bg-[#c70017] group-hover:text-white transition-colors">
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {trendValue}%
        </div>
      )}
    </div>
    <p className="text-[10px] font-black uppercase tracking-widest text-[#a8a29e] mb-1">{title}</p>
    <h3 className="text-3xl font-semibold tracking-tight text-[#211b10]">{value}</h3>
    <p className="text-[10px] text-[#a8a29e] mt-1 font-medium">{subValue}</p>
  </div>
);

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, isLoading }: any) => {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#211b10]/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-sm shadow-2xl overflow-hidden border border-[#c70017]/20"
          >
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-sm bg-red-50 text-[#c70017]">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[#211b10]">{title}</h3>
              </div>
              
              <p className="text-sm leading-relaxed text-[#5d3f3c] mb-8">
                {message}
              </p>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 text-xs font-black uppercase tracking-widest text-[#a8a29e] hover:text-[#211b10] transition-colors disabled:opacity-50"
                >
                  {t("cancel") || "Cancel"}
                </button>
                <button 
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 text-xs font-black uppercase tracking-widest bg-[#c70017] text-white rounded-sm hover:bg-[#a50013] transition-colors shadow-lg shadow-[#c70017]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} 
                  {t("confirm reset") || "Confirm Reset"}
                </button>
              </div>
            </div>
            {/* Intensity Bar */}
            <div className="h-1 w-full bg-[#f9ecdb]">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.5 }}
                className="h-full bg-[#c70017]" 
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const ViolationTimeline = ({ isOpen, onClose, vehicle, violations }: any) => {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[201] bg-[#211b10]/40 backdrop-blur-[2px]"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[202] shadow-2xl border-l border-[#c70017]/10 flex flex-col"
          >
            <div className="p-6 border-b border-[#926f6b]/10 bg-[#f9ecdb]/30 flex justify-between items-center">
              <div>
                <p className="pl-overline mb-1">{t("violation history") || "Violation History"}</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-[#211b10]">{vehicle?.plate}</h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#c70017] text-white">
                    {violations.length} {t("total events") || "Events"}
                  </span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white rounded-sm text-[#a8a29e] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[#fff8f2]/30">
              <div className="space-y-6 relative">
                {/* Visual Timeline Path */}
                <div className="absolute left-[11px] top-6 bottom-6 w-px bg-gradient-to-b from-[#c70017] to-[#f9ecdb]" />
                
                {violations.map((v: Violation, i: number) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={v.id || i} 
                    className="relative pl-8"
                  >
                    {/* Circle */}
                    <div className="absolute left-0 top-1.5 w-[23px] h-[23px] rounded-full border-2 border-white bg-[#c70017] flex items-center justify-center shadow-lg" />
                    
                    <div className="bg-white p-4 rounded-sm border border-[#926f6b]/10 shadow-sm hover:border-[#c70017]/20 transition-all cursor-default">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#c70017]">{v.type}</span>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-[#211b10]">{format(v.date.toDate(), "dd MMM, yyyy")}</span>
                          <span className="text-[10px] text-[#a8a29e] font-medium">{format(v.date.toDate(), "HH:mm:ss")}</span>
                        </div>
                      </div>
                      
                      {v.location && (
                        <div className="flex items-start gap-2 text-[10px] text-[#5d3f3c] bg-[#f9ecdb]/20 p-2 rounded-sm border border-[#926f6b]/5">
                          <Search size={10} className="mt-0.5 shrink-0" />
                          <span className="leading-tight">{v.location}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default function BehaviorMonitoringPage() {
  const { t } = useLanguage();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedPlate, setSelectedPlate] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  
  // Filtering
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 60), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd")
  });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const vels = await getVehicles();
      const viols = await getViolationsByRange(
        startOfDay(new Date(dateRange.start)),
        endOfDay(new Date(dateRange.end))
      );
      setVehicles(vels);
      setViolations(viols);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // Comparison Logic (Fetch previous period)
  const [prevStats, setPrevStats] = useState<any>(null);
  useEffect(() => {
    const fetchPrev = async () => {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      const diff = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - diff - 86400000);
      const prevEnd = new Date(start.getTime() - 86400000);
      
      const prevViols = await getViolationsByRange(prevStart, prevEnd);
      
      const total = prevViols.length;
      const uniqueVehicles = new Set(prevViols.map(v => v.plate)).size;
      setPrevStats({ total, uniqueVehicles });
    };
    fetchPrev();
  }, [dateRange]);

  // Aggregated Data for Main View
  const aggregatedData = useMemo(() => {
    const map = new Map<string, { plate: string; vehicleName: string; violations: Record<string, number>; total: number }>();

    violations.forEach(v => {
      const plate = v.plate;
      if (!map.has(plate)) {
        const vel = vehicles.find(veh => normalizePlate(veh.plateNumber) === plate);
        map.set(plate, {
          plate,
          vehicleName: vel?.makeAndModel || "Unknown",
          violations: {},
          total: 0
        });
      }
      const entry = map.get(plate)!;
      entry.violations[v.type] = (entry.violations[v.type] || 0) + 1;
      entry.total += 1;
    });

    return Array.from(map.values())
      .filter(d => 
        d.plate.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.vehicleName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.total - a.total);
  }, [violations, vehicles, searchTerm]);

  // Charts data
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    violations.forEach(v => {
      counts[v.type] = (counts[v.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [violations]);

  const dailyTrend = useMemo(() => {
    const days = eachDayOfInterval({
      start: new Date(dateRange.start),
      end: new Date(dateRange.end)
    });

    return days.map(day => {
      const count = violations.filter(v => isSameDay(v.date.toDate(), day)).length;
      return {
        date: format(day, "MMM dd"),
        violations: count
      };
    });
  }, [violations, dateRange]);

  const timelineViolations = useMemo(() => {
    if (!selectedPlate) return [];
    return violations
      .filter(v => normalizePlate(v.plate) === selectedPlate)
      .sort((a, b) => b.date.toMillis() - a.date.toMillis());
  }, [selectedPlate, violations]);

  const selectedVehicleData = useMemo(() => {
    if (!selectedPlate) return null;
    return aggregatedData.find(d => d.plate === selectedPlate);
  }, [selectedPlate, aggregatedData]);

  const kpis = useMemo(() => {
    const total = violations.length;
    const affectedVehicles = new Set(violations.map(v => v.plate)).size;
    
    // Comparison calc
    const prevTotal = prevStats?.total || 0;
    const totalTrend = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;
    const prevAffected = prevStats?.uniqueVehicles || 0;
    const affectedTrend = prevAffected > 0 ? Math.round(((affectedVehicles - prevAffected) / prevAffected) * 100) : 0;

    // Lead offense
    const typeEntries = Object.entries(typeDistribution.reduce((acc, curr) => {
      acc[curr.name] = curr.value;
      return acc;
    }, {} as any)).sort((a: any, b: any) => b[1] - a[1]);
    
    const leadOffense = typeEntries.length > 0 ? typeEntries[0][0] : "None";

    return {
      total,
      totalTrend: totalTrend >= 0 ? 'up' : 'down',
      totalTrendValue: Math.abs(totalTrend),
      affectedVehicles,
      affectedTrend: affectedTrend >= 0 ? 'up' : 'down',
      affectedTrendValue: Math.abs(affectedTrend),
      avgPerVehicle: affectedVehicles > 0 ? (total / affectedVehicles).toFixed(1) : "0",
      leadOffense
    };
  }, [violations, typeDistribution, prevStats]);

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

        // Based on research: headers start at row 9 (index 9)
        // [Reg (0), null (1), Location (2), Timestamp (3), Event (4)]
        const uploadData: any[] = [];
        let headerRowFound = false;

        rawItems.forEach((row, idx) => {
          if (row[0] === "Registration" && row[3] === "Event Date and TIme") {
            headerRowFound = true;
            return;
          }
          if (!headerRowFound) return;

          const plate = String(row[0] || "").trim();
          if (!plate) return;

          // Excel Timestamp. index 3 can be a number or string
          let dateObj: Date;
          if (typeof row[3] === "number") {
             // Convert Excel serial date to JS Date
             dateObj = new Date((row[3] - 25569) * 86400 * 1000);
          } else {
             dateObj = new Date(row[3]);
          }

          if (isNaN(dateObj.getTime())) return;

          uploadData.push({
            plate,
            date: dateObj,
            type: String(row[4] || "Unknown Violation"),
            location: String(row[2] || "")
          });
        });

        if (uploadData.length === 0) throw new Error("No valid violation rows found.");

        const result = await uploadViolationsBatch(uploadData);
        alert(`Successfully processed AI Report. Total events: ${uploadData.length}. Deduplicated unique daily violations: ${result.count}.`);
        fetchData();
        setShowUpload(false);
      } catch (err: any) {
        alert(`Inversion failed: ${err.message}`);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleReset = async () => {
    setShowResetModal(true);
  };

  const confirmReset = async () => {
    setResetting(true);
    try {
      const result = await resetAIBehaviorData();
      alert((t("reset success") || "Successfully cleared AI data. Total deleted: ") + result.deletedCount);
      fetchData();
    } catch (e: any) {
      alert("Error resetting data: " + e.message);
    } finally {
      setResetting(false);
      setShowResetModal(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <ViolationTimeline
        isOpen={!!selectedPlate}
        onClose={() => setSelectedPlate(null)}
        vehicle={selectedVehicleData}
        violations={timelineViolations}
      />
      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={confirmReset}
        isLoading={resetting}
        title={t("behavior reset title") || "Reset Behavior Data"}
        message={t("violation reset warning") || "This will permanently delete all previously uploaded AI Behavioral violation data. This action is irreversible. Do you want to proceed?"}
      />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="pl-overline mb-1">{t("behavior monitoring")}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[#211b10]">{t("fleet behavior intelligence")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleReset} 
            disabled={resetting}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-white text-[#c70017] border border-[#c70017]/20 hover:bg-[#c70017]/5 rounded-sm flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {resetting ? <Loader2 size={14} className="animate-spin" /> : <History size={14} />} {t("reset & clear data")}
          </button>
          <button onClick={() => setShowUpload(!showUpload)} className="btn-precision flex items-center gap-2 bg-[#c70017] text-white">
             {showUpload ? <X size={16} /> : <Upload size={16} />} {showUpload ? t("cancel") : t("import operational data")}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showUpload && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-8 rounded-sm bg-white border border-[#c70017]/20 shadow-xl mb-8">
               <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-sm bg-red-50 text-[#c70017]">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t("ai ingestion title") || "AI Event Report Ingestion"}</h3>
                  <p className="text-sm text-[#5d3f3c]">{t("ai ingestion desc") || "Upload AI Camera Excel reports. The system will automatically deduplicate multiple events of the same type occurring on the same day for each vehicle."}</p>
                </div>
              </div>
              <div className="border-2 border-dashed border-[#926f6b]/20 rounded-sm p-10 text-center hover:border-[#c70017]/40 transition-colors group">
                <input type="file" accept=".xls,.xlsx" onChange={handleFileUpload} className="hidden" id="behavior-upload" />
                <label htmlFor="behavior-upload" className="cursor-pointer">
                  <Upload size={32} className="mx-auto mb-4 text-[#a8a29e] group-hover:text-[#c70017] transition-colors" />
                  <p className="text-sm font-semibold text-[#211b10]">{t("click to select report")}</p>
                  <p className="text-xs text-[#a8a29e] mt-1">{t("deduplication logic active") || "Deduplication: Plate + Date + Violation Type"}</p>
                </label>
              </div>
              {uploading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-[#c70017]">
                  <Loader2 size={16} className="animate-spin" /> {t("normalizing")}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <IndicatorCard 
          title={t("total violations") || "Total Violations"} 
          value={kpis.total} 
          subValue={t("detected across period") || "Detected across selected period"}
          trend={kpis.totalTrend}
          trendValue={kpis.totalTrendValue}
          icon={<AlertTriangle size={20} />}
        />
        <IndicatorCard 
          title={t("affected fleet units") || "Affected Fleet Units"} 
          value={kpis.affectedVehicles} 
          subValue={t("unique vehicles") || "Unique vehicles with events"}
          trend={kpis.affectedTrend}
          trendValue={kpis.affectedTrendValue}
          icon={<Shield size={20} />}
        />
        <IndicatorCard 
          title={t("avg events/vehicle") || "Avg Events / Vehicle"} 
          value={kpis.avgPerVehicle} 
          subValue={t("fleet behavior average") || "Fleet-wide behavior mean"}
          icon={<Activity size={20} />}
        />
        <IndicatorCard 
          title={t("lead offense") || "Lead Offense"} 
          value={kpis.leadOffense} 
          subValue={t("most frequent violation") || "Most common violation"}
          icon={<Zap size={20} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 border border-[#926f6b]/10 rounded-sm h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black uppercase tracking-tighter text-[#a8a29e] flex items-center gap-2">
              <TrendingUp size={14} /> {t("behavioral trend line") || "Behavioral Violation Trends"}
            </h3>
            <div className="flex items-center gap-2">
               <input 
                type="date" 
                value={dateRange.start} 
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="text-[10px] font-bold border-none bg-[#f9ecdb] p-1 rounded-sm focus:ring-0"
               />
               <span className="text-[#a8a29e] text-[10px]">to</span>
               <input 
                type="date" 
                value={dateRange.end} 
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="text-[10px] font-bold border-none bg-[#f9ecdb] p-1 rounded-sm focus:ring-0"
               />
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrend}>
              <defs>
                <linearGradient id="violGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c70017" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#c70017" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <ReTooltip cursor={{ stroke: '#c7001720' }} />
              <Area type="monotone" dataKey="violations" stroke="#c70017" strokeWidth={2} fillOpacity={1} fill="url(#violGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution Chart */}
        <div className="bg-white p-6 border border-[#926f6b]/10 rounded-sm h-[400px] flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-tighter text-[#a8a29e] mb-6 flex items-center gap-2">
            <PieIcon size={14} /> {t("violation distribution") || "Violation Type Distribution"}
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {typeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <ReTooltip />
              <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Aggregated Violations Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold tracking-tight">{t("fleet behavior scorecards") || "Fleet Behavior Statistics"}</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]" size={14} />
              <input 
                type="text" 
                placeholder={t("Filter fleet...")} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-white border border-[#926f6b]/20 rounded-sm outline-none text-xs w-64 focus:border-[#c70017]/40"
              />
            </div>
          </div>
        </div>

        <div className="rounded-sm overflow-hidden bg-white border border-[#926f6b]/10 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f9ecdb]">
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[#5d3f3c]">{t("vehicle info") || "Vehicle Information"}</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-[#5d3f3c]">{t("total events") || "Total Events"}</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[#5d3f3c]">{t("violation split") || "Violation Breakdown"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#926f6b]/5">
                {loading ? (
                  <tr><td colSpan={3} className="py-20 text-center text-[#a8a29e] font-bold"><Loader2 className="animate-spin inline mr-2" /> {t("syncing behavior")}</td></tr>
                ) : aggregatedData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-20 text-center">
                      <p className="text-lg font-semibold text-[#5d3f3c]">{t("no data detected") || "No behavioral data detected"}</p>
                      <p className="text-sm text-[#a8a29e]">{t("upload report suggestion") || "Please upload an AI Event Report to begin monitoring."}</p>
                    </td>
                  </tr>
                ) : (
                  aggregatedData.map((d, i) => (
                    <tr 
                      key={i} 
                      onClick={() => setSelectedPlate(d.plate)}
                      className="hover:bg-[#fff8f2] transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-[#211b10]">{d.plate}</span>
                          <span className="text-[10px] text-[#a8a29e] font-bold uppercase tracking-wider">{d.vehicleName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`text-xl font-black ${d.total > 10 ? 'text-[#c70017]' : 'text-[#211b10]'}`}>{d.total}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(d.violations).map(([type, count], idx) => (
                            <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-[#211b10]/5 group-hover:bg-white border border-transparent group-hover:border-[#c70017]/10 transition-colors">
                              <span className="text-[10px] font-black text-[#5d3f3c]">{type}</span>
                              <span className={`text-[10px] font-black px-1.5 rounded-full ${count > 3 ? 'bg-[#c70017] text-white' : 'bg-[#f9ecdb] text-[#c70017]'}`}>
                                {count}
                              </span>
                            </div>
                          ))}
                        </div>
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
