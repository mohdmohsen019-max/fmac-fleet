import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { LanguageAuthBridge } from "@/components/LanguageAuthBridge";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FMAC Fleet Management System",
  description: "Track fleet usage, log trips, and manage vehicle maintenance.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`} dir="ltr">
      <body className="min-h-screen" style={{ backgroundColor: "#fff8f2", color: "#211b10", fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" }}>
        <AuthProvider>
          <LanguageProvider>
            {/* Bridge that wires AuthContext language preference → LanguageContext */}
            <LanguageAuthBridge />
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
