import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, doc, runTransaction, Timestamp } from "firebase/firestore";
import { Trip } from "@/lib/schema";

const TRIPS_COL = "trips";
const VEHICLES_COL = "vehicles";
const ODOMETER_LOGS_COL = "odometerLogs";

export const getTripsByDriver = async (driverId: string): Promise<Trip[]> => {
  const q = query(
    collection(db, TRIPS_COL), 
    where("driverId", "==", driverId)
  );
  
  const snapshot = await getDocs(q);
  const trips = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  })) as Trip[];

  // Sort in memory to avoid needing a composite index
  return trips.sort((a, b) => b.date.toMillis() - a.date.toMillis());
};

export const getAllTrips = async (): Promise<Trip[]> => {
  const q = query(collection(db, TRIPS_COL));
  const snapshot = await getDocs(q);
  const trips = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  })) as Trip[];

  // Sort in memory to avoid index requirements
  return trips.sort((a, b) => b.date.toMillis() - a.date.toMillis());
};

// Logs a trip, updates the vehicle odometer, and creates an audit log
export const logTrip = async (
  driverId: string,
  vehicleId: string,
  tripType: "Internal" | "External",
  startOdometer: number,
  endOdometer: number,
  notes?: string
): Promise<void> => {
  if (endOdometer < startOdometer) {
    throw new Error("End odometer cannot be less than start odometer.");
  }

  const distance = endOdometer - startOdometer;
  const flagged = distance > 1000; // Flag jump if > 1000

  const vehicleRef = doc(db, VEHICLES_COL, vehicleId);
  const newTripRef = doc(collection(db, TRIPS_COL));
  const newLogRef = doc(collection(db, ODOMETER_LOGS_COL));

  await runTransaction(db, async (transaction) => {
    const vehicleDoc = await transaction.get(vehicleRef);

    if (!vehicleDoc.exists()) {
      throw new Error("Vehicle does not exist.");
    }

    const currentOdometer = vehicleDoc.data().currentOdometer;

    if (startOdometer < currentOdometer) {
      throw new Error("Start odometer is lower than vehicle's current recorded odometer.");
    }

    const tripData: Omit<Trip, "id"> = {
      vehicleId,
      driverId,
      tripType,
      startOdometer,
      endOdometer,
      distance,
      date: Timestamp.now(),
      notes,
      createdAt: Timestamp.now(),
    };

    const odometerLogData = {
      vehicleId,
      previousOdometer: currentOdometer,
      newOdometer: endOdometer,
      source: "Trip",
      sourceId: newTripRef.id,
      recordedBy: driverId,
      date: Timestamp.now(),
      flagged,
    };

    // Update vehicle
    transaction.update(vehicleRef, { currentOdometer: endOdometer });
    // Write Trip
    transaction.set(newTripRef, tripData);
    // Write Immutable Audit Log
    transaction.set(newLogRef, odometerLogData);
  });
};
