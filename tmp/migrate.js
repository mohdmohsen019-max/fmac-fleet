const fs = require('fs');
const path = require('path');
const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

// Load environment variables manually since dotenv might not be installed
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
});

const firebaseConfig = {
  apiKey: envVars.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: envVars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: envVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runMigration() {
  console.log('Starting migration...');
  const vehiclesRef = collection(db, "vehicles");
  const snapshot = await getDocs(vehiclesRef);

  let updatedCount = 0;
  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data();
    const id = docSnapshot.id;
    let newMakeAndModel = undefined;

    if (data.plateNumber === "FUJ-M-99271") {
      newMakeAndModel = "Toyota Innova";
    } else if (data.plateNumber === "FUJ-A-45267") {
      newMakeAndModel = "Nissan Altima";
    } else if (data.plateNumber === "FUJ-A-20107") {
      newMakeAndModel = "Nissan X-Trail";
    } else if (data.type === "Bus") {
      newMakeAndModel = "Toyota Coaster";
    }

    if (newMakeAndModel !== undefined && data.makeAndModel !== newMakeAndModel) {
      console.log(`Updating ${data.plateNumber} to ${newMakeAndModel}`);
      await updateDoc(doc(db, "vehicles", id), {
        makeAndModel: newMakeAndModel
      });
      updatedCount++;
    }
  }

  console.log(`Migration complete. Updated ${updatedCount} vehicles.`);
}

runMigration().catch(console.error).finally(() => process.exit(0));
