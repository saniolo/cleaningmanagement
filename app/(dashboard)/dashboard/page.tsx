import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-600">
        Benvenuto, <span className="font-medium">{session.user.name ?? session.user.email}</span>!
      </p>
      <pre className="mt-6 p-4 bg-gray-100 rounded-lg text-sm overflow-auto">
        {JSON.stringify(session, null, 2)}
      </pre>
    </div>
  );
}
