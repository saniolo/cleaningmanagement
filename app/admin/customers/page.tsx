import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "./customer-form";
import { CustomersTable } from "./customers-table";

export default async function CustomersPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const customers = await prisma.customer.findMany({
    where: { companyId: admin.companyId },
    include: { _count: { select: { locations: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clienti e attività"
        description="Clienti, location e servizi di pulizia."
        actions={<CustomerForm trigger={<Button>Nuovo cliente</Button>} />}
      />

      {customers.length === 0 ? (
        <EmptyState title="Nessun cliente presente." />
      ) : (
        <CustomersTable customers={customers} />
      )}
    </div>
  );
}
