import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { MonthlyStatement } from "@/lib/schema";

const STATEMENTS_COL = "monthlyStatements";

export const uploadStatement = async (
  file: File,
  monthYear: string,
  uploadedBy: string
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('monthYear', monthYear);
  formData.append('uploadedBy', uploadedBy);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload statement');
  }

  const data = await res.json();
  return data.id;
};

export const getAllStatements = async (): Promise<MonthlyStatement[]> => {
  const q = query(collection(db, STATEMENTS_COL), orderBy("monthYear", "desc"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as MonthlyStatement[];
};
