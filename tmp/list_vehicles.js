const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const serviceAccount = require('c:/Users/97154/Desktop/FMAC Fleet Management System/serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const snapshot = await db.collection('vehicles').get();
  const list = snapshot.docs.map(doc => ({
    id: doc.id,
    type: doc.data().type,
    plate: doc.data().plateNumber,
    name: doc.data().makeAndModel
  }));
  console.log(JSON.stringify(list, null, 2));
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
