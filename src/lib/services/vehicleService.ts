import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from "firebase/firestore";
import { Vehicle } from "@/lib/schema";

const COLLECTION_NAME = "vehicles";

export const getVehicles = async (): Promise<Vehicle[]> => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Vehicle[];
};

export const addVehicle = async (vehicle: Omit<Vehicle, "id" | "createdAt">): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...vehicle,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const updateVehicle = async (id: string, updates: Partial<Omit<Vehicle, "id" | "createdAt">>): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, updates);
};

export const deleteVehicle = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};
