import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BfcacheGuard from "@/components/BfcacheGuard";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", weight: ["500", "600"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Sip & Savor Spot",
  description: "Coffee, specialty drinks, snacks, and rice meals. TARA KAPE.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: "customer" | "admin" | "super_admin" | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = (profile?.role as "customer" | "admin" | "super_admin") ?? "customer";
  }

  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="bg-[#F9F6F0] font-sans text-stone-800" suppressHydrationWarning>
        <BfcacheGuard />
        <Navbar initialLoggedIn={!!user} initialRole={role} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
