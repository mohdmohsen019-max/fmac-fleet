const { initializeApp, getApps, getApp } = require('firebase/app');
const { getStorage, ref, uploadBytes } = require('firebase/storage');
const fs = require('fs');
const path = require('path');

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
const storage = getStorage(app);

async function run() {
  try {
    const storageRef = ref(storage, 'test_file.txt');
    const buffer = Buffer.from('hello world');
    // uploadBytes in node
    await uploadBytes(storageRef, new Uint8Array(buffer), { contentType: 'text/plain' });
    console.log('Upload ok');
  } catch (err) {
    console.error('Upload failed!');
    console.error('Code:', err.code);
    console.error('Message:', err.message);
    if (err.customData && err.customData.serverResponse) {
      console.error('Server Response:', err.customData.serverResponse);
    } else {
        console.log(err);
    }
  }
}

run();
