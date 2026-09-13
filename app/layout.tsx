import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BfcacheGuard from "@/components/BfcacheGuard";
import RememberMeGuard from "@/components/RememberMeGuard";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", weight: ["500", "600"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Sip & Savor Spot",
    "coffee shop Ibaan",
    "Batangas cafe",
    "Ibaan Batangas coffee",
    "al fresco coffee shop Philippines",
  ],
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
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
        <RememberMeGuard />
        <Navbar initialLoggedIn={!!user} initialRole={role} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
