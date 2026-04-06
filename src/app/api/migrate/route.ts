import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, query, orderBy, limit, where } from "firebase/firestore";
import { Vehicle } from "@/lib/schema";
import { NextResponse } from "next/server";

const BUS_MAPPING: Record<string, string> = {
  "FUJ-A-33867": "1",
  "FUJ-C-37082": "2",
  "FUJ-M-99268": "3",
  "FUJ-C-37075": "4",
  "FUJ-M-85759": "5",
  "FUJ-A-21248": "6",
  "FUJ-C-37069": "7",
  "FUJ-A-33866": "8",
  "FUJ-M-85750": "9",
  "FUJ-M-85751": "10",
  "FUJ-C-29769": "13",
  "FUJ-C-37074": "14",
  "FUJ-M-85756": "15",
  "FUJ-M-99270": "16",
};

export async function GET() {
  try {
    const vehiclesSnap = await getDocs(collection(db, "vehicles"));
    const batch = writeBatch(db);
    
    let deletedCount = 0;
    let updatedCount = 0;

    for (const vDoc of vehiclesSnap.docs) {
      const data = vDoc.data() as Vehicle;
      const id = vDoc.id;

      if (data.type === "Car") {
        batch.delete(vDoc.ref);
        deletedCount++;
      } else if (data.type === "Bus") {
        const busNumber = BUS_MAPPING[data.plateNumber] || "N/A";
        
        // Try to find last driven by from trips
        const tripQ = query(
          collection(db, "trips"),
          where("vehicleId", "==", id)
        );
        const tripSnap = await getDocs(tripQ);
        
        let lastDriverName = data.lastDrivenBy || "N/A";
        let lastDriverId = data.lastDriverId || "";

        if (!tripSnap.empty) {
          // Sort in-memory to find latest trip without needing a composite index
          const lastTripDoc = tripSnap.docs.sort((a, b) => b.data().date.toMillis() - a.data().date.toMillis())[0];
          const lastTrip = lastTripDoc.data();
          lastDriverId = lastTrip.driverId;
          
          const { getDoc } = await import("firebase/firestore");
          const userSnap = await getDoc(doc(db, "users", lastDriverId));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            lastDriverName = userData.displayName || userData.email || "Driver";
          }
        }

        batch.update(vDoc.ref, {
          busNumber,
          lastDrivenBy: lastDriverName,
          lastDriverId: lastDriverId
        });
        updatedCount++;
      }
    }

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      message: `Deleted ${deletedCount} cars, Updated ${updatedCount} buses.` 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
