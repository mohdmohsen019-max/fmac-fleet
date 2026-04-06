import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TopNav } from "@/components/layout/TopNav";
import { PageTransition } from "@/components/layout/PageTransition";

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["admin", "driver"]}>
      <div className="min-h-screen" style={{ backgroundColor: "#fff8f2" }}>
        <TopNav mode="driver" />
        <main className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-10">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
        <footer
          className="max-w-2xl mx-auto px-4 md:px-6 py-8 mt-16"
          style={{ borderTop: "1px solid rgba(146,111,107,0.15)" }}
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <img src="/fmac-logo.png?v=4" alt="FMAC" className="h-7 w-auto object-contain" />
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em]" style={{ color: "#a8a29e" }}>Fleet Management</span>
            </div>
            <p className="text-[0.6875rem] font-medium" style={{ color: "#a8a29e" }}>
              © {new Date().getFullYear()} FMAC Fleet Operations
            </p>
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  );
}
