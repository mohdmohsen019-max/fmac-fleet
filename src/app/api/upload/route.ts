import { NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const STATEMENTS_COL = "monthlyStatements";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const monthYear = formData.get('monthYear') as string;
    const uploadedBy = formData.get('uploadedBy') as string;

    if (!file || !monthYear || !uploadedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // 1. Upload to Firebase Storage
    const storageRef = ref(storage, `statements/${monthYear}_${file.name}`);
    await uploadBytes(storageRef, arrayBuffer, { contentType: file.type });
    const fileUrl = await getDownloadURL(storageRef);

    // 2. Save metadata to Firestore
    const newRef = await addDoc(collection(db, STATEMENTS_COL), {
      monthYear,
      fileUrl,
      fileName: file.name,
      uploadedBy,
      uploadedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true, id: newRef.id });
  } catch (error: any) {
    console.error("API Upload Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
