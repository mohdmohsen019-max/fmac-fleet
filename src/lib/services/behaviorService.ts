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
    const docId = `${v.plate.trim().toUpperCase()}_${dateStr}_${typeKey}`;

    const docRef = doc(db, VIOLATIONS_COL, docId);
    await setDoc(docRef, v);
  }
};

/**
 * Upsert Scorecards (One per plate)
 */
export const upsertScorecards = async (scorecards: Omit<Scorecard, "id" | "updatedAt">[]) => {
  for (const s of scorecards) {
    const data = {
      ...s,
      updatedAt: Timestamp.now()
    };
    // Use plate as doc ID for easy upsert, or query if you prefer auto-ids. 
    // Querying is safer if we want to keep history, but user said "Vehicle Scoreboard (Top)" 
    // which implies a current state. I'll use setDoc with plate as ID.
    await setDoc(doc(db, SCORECARDS_COL, s.plate), data);
  }
};
