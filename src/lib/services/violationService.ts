import { db } from "../firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  Timestamp, 
  setDoc,
  doc,
  orderBy,
  writeBatch
} from "firebase/firestore";
import { Violation } from "../schema";
import { normalizePlate } from "./behaviorService";

const VIOLATIONS_COL = "violations";

export interface ViolationUploadData {
  plate: string;
  date: Date;
  type: string;
  location?: string;
}

/**
 * AI Report Ingestion with Deduplication
 * Deduplication Logic: One violation of TYPE per VEHICLE per DAY.
 */
export const uploadViolationsBatch = async (
  rawViolations: ViolationUploadData[],
  source: "AI Camera" | "Operational Report" = "AI Camera"
) => {
  if (rawViolations.length === 0) return { count: 0, batchId: null };

  const batchId = `batch_${Date.now()}`;
  
  // Find period range
  let minDate = rawViolations[0].date;
  let maxDate = rawViolations[0].date;
  rawViolations.forEach(v => {
    if (v.date < minDate) minDate = v.date;
    if (v.date > maxDate) maxDate = v.date;
  });

  const periodStart = Timestamp.fromDate(minDate);
  const periodEnd = Timestamp.fromDate(maxDate);

  // Group by deduplication key: PLATE_YYYYMMDD_TYPE
  const deduplicated = new Map<string, Violation>();

  rawViolations.forEach(v => {
    const plate = normalizePlate(v.plate);
    // Use full timestamp (including time) for more granular deduplication
    // ISO string is reliable for unique event identification
    const tsKey = v.date.toISOString();
    const typeKey = v.type.trim().replace(/\s+/g, '_').toLowerCase();
    const docId = `${plate}_${tsKey}_${typeKey}`;

    if (!deduplicated.has(docId)) {
      deduplicated.set(docId, {
        plate,
        date: Timestamp.fromDate(v.date),
        type: v.type.trim(),
        location: v.location || "",
        source,
        uploadBatchId: batchId,
        periodStart,
        periodEnd
      });
    }
  });

  // Batch write to Firestore
  const entries = Array.from(deduplicated.entries());
  console.log(`Processing ${entries.length} unique violations out of ${rawViolations.length} total.`);

  // Firestore batches are limited to 500 operations
  for (let i = 0; i < entries.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = entries.slice(i, i + 500);
    
    chunk.forEach(([docId, data]) => {
      const docRef = doc(db, VIOLATIONS_COL, docId);
      batch.set(docRef, data, { merge: true });
    });

    await batch.commit();
  }

  return { count: entries.length, batchId };
};

/**
 * Fetch violations for a specific date range
 */
export const getViolationsByRange = async (startDate: Date, endDate: Date): Promise<Violation[]> => {
  const q = query(
    collection(db, VIOLATIONS_COL),
    where("date", ">=", Timestamp.fromDate(startDate)),
    where("date", "<=", Timestamp.fromDate(endDate)),
    orderBy("date", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Violation));
};

/**
 * Clear all violations sourced from AI Camera or Operational Reports
 */
export const resetAIBehaviorData = async () => {
  const q = query(
    collection(db, VIOLATIONS_COL),
    where("source", "in", ["AI Camera", "Operational Report"])
  );

  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  return { deletedCount: snapshot.docs.length };
};
