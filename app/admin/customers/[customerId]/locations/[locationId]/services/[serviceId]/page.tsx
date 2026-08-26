import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { RecurringScheduleForm } from "./recurring-schedule-form";
import { RecurringSchedulesTable } from "./recurring-schedules-table";

export default async function ServiceDetailPage({
  params,
}: {
  params: { customerId: string; locationId: string; serviceId: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const service = await prisma.service.findFirst({
    where: {
      id: params.serviceId,
      locationId: params.locationId,
      companyId: admin.companyId,
    },
    include: { location: true },
  });
  if (!service) notFound();

  const schedules = await prisma.recurringSchedule.findMany({
    where: { serviceId: service.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-2" asChild>
        <Link href={`/admin/customers/${params.customerId}/locations/${params.locationId}`}>
          <ArrowLeft className="h-4 w-4" />
          {service.location.name}
        </Link>
      </Button>

      <PageHeader
        title={service.name}
        description={`Ricorrenze settimanali · ${service.estimatedDurationMinutes} min`}
        actions={
          <RecurringScheduleForm
            customerId={params.customerId}
            locationId={params.locationId}
            serviceId={service.id}
            trigger={<Button>Nuova ricorrenza</Button>}
          />
        }
      />

      {schedules.length === 0 ? (
        <EmptyState title="Nessuna ricorrenza configurata per questo servizio." />
      ) : (
        <RecurringSchedulesTable
          customerId={params.customerId}
          locationId={params.locationId}
          serviceId={service.id}
          schedules={schedules}
        />
      )}
    </div>
  );
}
