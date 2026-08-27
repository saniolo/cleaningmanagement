import Link from "next/link";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin();

  const [pendingAbsences, unassignedCount] = admin
    ? await Promise.all([
        prisma.absenceRequest.count({
          where: { companyId: admin.companyId, status: "PENDING" },
        }),
        prisma.assignment.count({
          where: { companyId: admin.companyId, status: "UNASSIGNED" },
        }),
      ])
    : [0, 0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={admin ? `Bentornato, ${admin.email}.` : "Riepilogo operativo della settimana."}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/admin/absences">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Richieste di assenza in attesa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{pendingAbsences}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/unassigned">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Attività da assegnare
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{unassignedCount}</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
