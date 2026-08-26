import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ServiceForm } from "./service-form";
import { ServicesTable } from "./services-table";

export default async function LocationDetailPage({
  params,
}: {
  params: { customerId: string; locationId: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const location = await prisma.location.findFirst({
    where: { id: params.locationId, customerId: params.customerId, companyId: admin.companyId },
    include: { customer: true },
  });
  if (!location) notFound();

  const services = await prisma.service.findMany({
    where: { locationId: location.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-2" asChild>
        <Link href={`/admin/customers/${params.customerId}`}>
          <ArrowLeft className="h-4 w-4" />
          {location.customer.name}
        </Link>
      </Button>

      <PageHeader
        title={location.name}
        description={`${location.addressLine}, ${location.city} (${location.province})`}
        actions={
          <ServiceForm
            customerId={params.customerId}
            locationId={location.id}
            trigger={<Button>Nuovo servizio</Button>}
          />
        }
      />

      {services.length === 0 ? (
        <EmptyState title="Nessun servizio presente per questa location." />
      ) : (
        <ServicesTable
          customerId={params.customerId}
          locationId={location.id}
          services={services}
        />
      )}
    </div>
  );
}
