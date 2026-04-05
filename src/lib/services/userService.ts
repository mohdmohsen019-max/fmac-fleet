import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc } from "firebase/firestore";
import { User } from "@/lib/schema";

const USERS_COL = "users";

export const getAllUsers = async (): Promise<User[]> => {
  const q = query(collection(db, USERS_COL), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  })) as User[];
};

export const updateUser = async (
  uid: string, 
  updates: Partial<Omit<User, "uid" | "createdAt" | "email">>
): Promise<void> => {
  const userRef = doc(db, USERS_COL, uid);
  await updateDoc(userRef, updates);
};
