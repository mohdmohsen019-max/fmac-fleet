import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { MaintenanceLog } from "@/lib/schema";

const MAINTENANCE_COL = "maintenance";

export const getAllMaintenance = async (): Promise<MaintenanceLog[]> => {
  const q = query(collection(db, MAINTENANCE_COL), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as MaintenanceLog[];
};

export const addMaintenance = async (
  log: Omit<MaintenanceLog, "id" | "createdAt">,
  vehiclePlateNumber: string // passed to context for notification
): Promise<string> => {
  const newLogRef = await addDoc(collection(db, MAINTENANCE_COL), {
    ...log,
    createdAt: Timestamp.now()
  });

  // Trigger web3forms alert in the background or right here
  try {
    await sendMaintenanceNotification(vehiclePlateNumber, log.description, log.cost);
  } catch (err) {
    console.error("Failed to send notification email", err);
  }

  return newLogRef.id;
};

// Web3Forms Integration
const sendMaintenanceNotification = async (plateNumber: string, description: string, cost?: number) => {
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;
  if (!accessKey) return;

  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      access_key: accessKey,
      subject: `New Maintenance Alert for Vehicle: ${plateNumber}`,
      from_name: "Fleet Management System",
      message: `
        A new maintenance log was just added.
        
        Vehicle Plate: ${plateNumber}
        Description: ${description}
        Cost: ${cost ? `${cost}` : 'Not provided'}
        
        Please check the admin dashboard for more details.
      `,
    }),
  });

  if (!response.ok) {
    throw new Error("Email alert failed to send");
  }
};
