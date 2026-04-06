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
  orderBy
} from "firebase/firestore";
import { Scorecard, Violation } from "../schema";

const SCORECARDS_COL = "scorecards";
const VIOLATIONS_COL = "violations";

export const normalizePlate = (p: string) => {
  if (!p) return "";
  return p.toUpperCase()
    .replace(/^FUJ-/i, '')
    .replace(/-/g, '')
    .trim();
};

export const getScorecards = async (): Promise<Scorecard[]> => {
  const snapshot = await getDocs(collection(db, SCORECARDS_COL));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Scorecard));
};

export const getViolations = async (): Promise<Violation[]> => {
  const q = query(collection(db, VIOLATIONS_COL), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => {
    const data = d.data();
    return { 
      id: d.id, 
      ...data,
      date: data.date 
    } as Violation;
  });
};

/**
 * Deduplicated Violation Insertion
 * Group by: vehicle_id (plate), date (ignore time), violation_type
 */
export const addUniqueViolations = async (violations: Omit<Violation, "id">[]) => {
  for (const v of violations) {
    // Generate a deterministic ID: PLATE_YYYYMMDD_TYPE
    // This allows deduplication at the DB level without complex queries or composite indexes.
    const dateObj = v.date.toDate();
    const dateStr = dateObj.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    const typeKey = v.type.trim().replace(/\s+/g, '_').toLowerCase();
    const normalizedPlate = normalizePlate(v.plate);
    const docId = `${normalizedPlate}_${dateStr}_${typeKey}`;

    const docRef = doc(db, VIOLATIONS_COL, docId);
    await setDoc(docRef, { ...v, plate: normalizedPlate });
  }
};

/**
 * Upsert Scorecards (One per plate)
 */
export const upsertScorecards = async (scorecards: Omit<Scorecard, "id" | "updatedAt">[]) => {
  for (const s of scorecards) {
    const normalizedPlate = normalizePlate(s.plate);
    const data = {
      ...s,
      plate: normalizedPlate,
      updatedAt: Timestamp.now()
    };
    await setDoc(doc(db, SCORECARDS_COL, normalizedPlate), data);
  }
};
