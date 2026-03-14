import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import { authOptions } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import AdminPanelClient from "@/app/admin/AdminPanelClient";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/");
  }

  if (!isAdminSession(session)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="mt-1 text-muted-foreground">
            Operations overview for players, matches, queues, and servers.
          </p>
        </div>
        <AdminPanelClient />
      </div>
    </div>
  );
}
