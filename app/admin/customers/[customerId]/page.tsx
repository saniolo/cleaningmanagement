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

export default async function CustomerDetailPage({ params }: { params: { customerId: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const customer = await prisma.customer.findFirst({
    where: { id: params.customerId, companyId: admin.companyId },
  });
  if (!customer) notFound();

  const services = await prisma.service.findMany({
    where: { customerId: customer.id },
    include: { recurringSchedules: true },
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
        description={`${customer.addressLine}, ${customer.city} (${customer.province})`}
        actions={
          <ServiceForm customerId={customer.id} trigger={<Button>Nuovo servizio</Button>} />
        }
      />

      {services.length === 0 ? (
        <EmptyState title="Nessun servizio presente per questo cliente." />
      ) : (
        <ServicesTable customerId={customer.id} services={services} />
      )}
    </div>
  );
}
