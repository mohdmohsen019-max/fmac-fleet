"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut as firebaseSignOut
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "driver";
  approved: boolean;
  displayName?: string;
  preferredLanguage?: "en" | "ar" | "ur";
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  // Callback so AuthContext can trigger language changes without circular deps
  onProfileLoaded?: (lang: "en" | "ar" | "ur") => void;
  setOnProfileLoaded: (cb: (lang: "en" | "ar" | "ur") => void) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  setOnProfileLoaded: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [onProfileLoaded, setOnProfileLoaded] = useState<((lang: "en" | "ar" | "ur") => void) | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setProfile(data);
            // Apply preferred language if set
            if (data.preferredLanguage && onProfileLoaded) {
              onProfileLoaded(data.preferredLanguage);
            }
          } else {
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              role: "driver",
              approved: false
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            role: "driver",
            approved: false
          });
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [onProfileLoaded]);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, onProfileLoaded, setOnProfileLoaded }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
