import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F9F6F0]">
      <AdminSidebar />
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-10 print:ml-0 md:ml-60">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
