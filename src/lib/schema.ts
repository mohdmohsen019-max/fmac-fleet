// src/lib/schema.ts
import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: "admin" | "driver";
  approved: boolean;
  preferredLanguage?: "en" | "ar" | "ur";
  createdAt: Timestamp;
}

export interface Vehicle {
  id?: string;
  plateNumber: string;
  makeAndModel?: string;
  busNumber?: string;
  lastDrivenBy?: string;
  lastDriverId?: string;
  type: "Car" | "Bus";
  currentOdometer: number;
  status: "Active" | "In Maintenance" | "Out of Service";
  createdAt: Timestamp;
}

export interface Trip {
  id?: string;
  vehicleId: string;
  driverId: string;
  tripType: "Internal" | "External";
  startOdometer: number;
  endOdometer: number;
  distance: number;
  date: Timestamp;
  notes?: string;
  createdAt: Timestamp;
}

export interface OdometerLog {
  id?: string;
  vehicleId: string;
  previousOdometer: number;
  newOdometer: number;
  source: "Trip" | "Admin Correction";
  sourceId?: string; // e.g., tripId
  recordedBy: string; // userId
  date: Timestamp;
  flagged: boolean;
}

export interface MaintenanceLog {
  id?: string;
  vehicleId: string;
  description: string;
  cost?: number;
  date: Timestamp;
  recordedBy: string; // admin userId
  createdAt: Timestamp;
}

export interface MonthlyStatement {
  id?: string;
  monthYear: string; // e.g., '2026-04'
  fileUrl: string;
  fileName: string;
  uploadedBy: string; // admin userId
  uploadedAt: Timestamp;
}

export interface Violation {
  id?: string;
  plate: string;
  date: Timestamp;
  type: string;
  location?: string;
  source: "AI Camera" | "Manual" | "Operational Report";
  uploadBatchId?: string;
  periodStart?: Timestamp;
  periodEnd?: Timestamp;
}

export interface Scorecard {
  id?: string;
  plate: string;
  kms: number;
  trips: number;
  afterHoursTrips: number;
  braking: number;
  acceleration: number;
  cornering: number;
  idlingCount: number;
  idlingTime: string; // "HH:MM:SS"
  speed80: number;
  speed100: number;
  speed120: number;
  speed140: number;
  avgSpeed: number;
  totalDuration: string; // "HH:MM:SS"
  updatedAt: Timestamp;
}
