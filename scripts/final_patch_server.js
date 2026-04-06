const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const BUS_MAPPING = {
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

async function patch() {
  console.log("Starting manual fleet patch...");
  const batch = db.batch();
  
  // 1. Delete all Cars
  const vehiclesSnap = await db.collection('vehicles').get();
  let carCount = 0;
  let busCount = 0;

  for (const doc of vehiclesSnap.docs) {
    const data = doc.data();
    // Assuming 'type' was used before, or checking for Cars we know are cars
    if (data.type === 'Car' || data.makeAndModel?.toLowerCase().includes('ford f150') || data.makeAndModel?.toLowerCase().includes('innova')) {
      batch.delete(doc.ref);
      carCount++;
    } else {
      // It's a bus, apply numbering
      const busNum = BUS_MAPPING[data.plateNumber];
      if (busNum) {
        batch.update(doc.ref, { busNumber: busNum });
        busCount++;
      }
    }
  }

  await batch.commit();
  console.log(`Patch complete. Deleted ${carCount} cars. Updated ${busCount} buses.`);
  process.exit(0);
}

patch().catch(err => {
  console.error(err);
  process.exit(1);
});
