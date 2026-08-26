import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { LocationForm } from "./location-form";
import { LocationsTable } from "./locations-table";

export default async function CustomerDetailPage({ params }: { params: { customerId: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const customer = await prisma.customer.findFirst({
    where: { id: params.customerId, companyId: admin.companyId },
  });
  if (!customer) notFound();

  const locations = await prisma.location.findMany({
    where: { customerId: customer.id },
    include: { _count: { select: { services: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-2" asChild>
        <Link href="/admin/customers">
          <ArrowLeft className="h-4 w-4" />
          Clienti
        </Link>
      </Button>

      <PageHeader
        title={customer.name}
        description="Location e servizi di questo cliente."
        actions={
          <LocationForm customerId={customer.id} trigger={<Button>Nuova location</Button>} />
        }
      />

      {locations.length === 0 ? (
        <EmptyState title="Nessuna location presente per questo cliente." />
      ) : (
        <LocationsTable customerId={customer.id} locations={locations} />
      )}
    </div>
  );
}
