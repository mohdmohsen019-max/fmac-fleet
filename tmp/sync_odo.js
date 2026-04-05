const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, updateDoc, addDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyB2nfzm7mRL2tE1Msf2yZFKimdd1AIQpI8",
  authDomain: "fmac-fleet-management-system.firebaseapp.com",
  projectId: "fmac-fleet-management-system",
  storageBucket: "fmac-fleet-management-system.firebasestorage.app",
  messagingSenderId: "835939061602",
  appId: "1:835939061602:web:bdd5391aef2e94039d263b",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const mapping = {
  "A21248": 290502,
  "A33867": 425572.94,
  "A33876": 279705,
  "C29769": 281870,
  "C37069": 285579,
  "C37072": 323543,
  "C37074": 202100.06,
  "C37075": 379389,
  "M15143": 195664,
  "M85750": 202067,
  "M85751": 162465.73,
  "M85756": 227517.44,
  "M85759": 211927.77,
  "M99267": 189321,
  "M99268": 77715,
  "M99270": 230835,
  "M99271": 380479,
  "M99273": 188564.61
};

async function sync() {
  console.log("Starting sync...");
  const vehiclesCol = collection(db, "vehicles");
  const logsCol = collection(db, "odometerLogs");
  
  for (const [rawPlate, newOdo] of Object.entries(mapping)) {
    // Transform A21248 -> FUJ-A-21248
    const letter = rawPlate.charAt(0);
    const numbers = rawPlate.substring(1);
    const plate = `FUJ-${letter}-${numbers}`;

    const q = query(vehiclesCol, where("plateNumber", "==", plate));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.warn(`[SKIP] Vehicle ${plate} not found in database.`);
      continue;
    }
    
    const vDoc = snapshot.docs[0];
    const prevOdo = vDoc.data().currentOdometer || 0;
    
    // Update Vehicle
    await updateDoc(vDoc.ref, { currentOdometer: newOdo });
    
    // Log Change
    await addDoc(logsCol, {
      vehicleId: vDoc.id,
      plateNumber: plate,
      oldValue: prevOdo,
      newValue: newOdo,
      date: Timestamp.now(),
      source: "Admin Correction",
      notes: "Synchronized from March 2026 Odometer report",
      flagged: false
    });
    
    console.log(`[OK] Updated ${plate}: ${prevOdo} -> ${newOdo}`);
  }
  console.log("Sync complete.");
  process.exit(0);
}

sync().catch((err) => {
  console.error(err);
  process.exit(1);
});
