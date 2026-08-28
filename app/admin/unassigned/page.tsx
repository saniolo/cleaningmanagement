import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { getEligibleEmployees } from "@/lib/scheduling/eligibility";
import { dateValueToDateString, formatLongDateIT } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CustomerUnassignedCard, type UnassignedOccurrence } from "./customer-unassigned-card";

export default async function UnassignedPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const [employees, assignments] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId: admin.companyId, active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.assignment.findMany({
      where: { companyId: admin.companyId, status: "UNASSIGNED" },
      include: { service: { include: { customer: true } } },
      orderBy: { date: "asc" },
    }),
  ]);

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
  }));

  // One card per customer — clicking it drills into every occurrence still
  // needing a person, across all of that customer's services, instead of
  // showing a separate card per service/day on the main page. Grouping by
  // recurring schedule (so the same activity's repeated dates can still be
  // bulk-assigned together) happens one level down, inside the customer's
  // own dialog — see CustomerUnassignedCard.
  interface CustomerGroup {
    customerId: string;
    customerName: string;
    address: string;
    earliestDate: Date;
    occurrences: UnassignedOccurrence[];
  }
  const byCustomer = new Map<string, CustomerGroup>();

  for (const a of assignments) {
    const pendingReplacement = await prisma.replacementRequest.findFirst({
      where: { assignmentId: a.id, status: "PENDING" },
      include: { proposedEmployee: true },
    });

    const eligibleEmployees = pendingReplacement
      ? []
      : await getEligibleEmployees(admin.companyId, a.date);

    const customer = a.service.customer;
    let group = byCustomer.get(customer.id);
    if (!group) {
      group = {
        customerId: customer.id,
        customerName: customer.name,
        address: customer.addressLine,
        earliestDate: a.date,
        occurrences: [],
      };
      byCustomer.set(customer.id, group);
    }
    if (a.date < group.earliestDate) group.earliestDate = a.date;

    group.occurrences.push({
      id: a.id,
      date: dateValueToDateString(a.date),
      displayDate: formatLongDateIT(a.date),
      durationMinutes: a.durationMinutes,
      serviceName: a.service.name,
      sourceRecurringScheduleId: a.sourceRecurringScheduleId,
      pendingReplacement: pendingReplacement
        ? {
            id: pendingReplacement.id,
            proposedEmployeeName: `${pendingReplacement.proposedEmployee.firstName} ${pendingReplacement.proposedEmployee.lastName}`,
          }
        : null,
      eligibleEmployees,
    });
  }

  const customerGroups = Array.from(byCustomer.values()).sort(
    (a, b) => a.earliestDate.getTime() - b.earliestDate.getTime()
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attività da assegnare"
        description="Clienti con attività scoperte, in ordine di data. Apri un cliente per assegnare ogni occorrenza."
      />

      {customerGroups.length === 0 ? (
        <EmptyState title="Nessuna attività da riassegnare." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {customerGroups.map((group) => (
            <CustomerUnassignedCard
              key={group.customerId}
              customerName={group.customerName}
              address={group.address}
              occurrences={group.occurrences}
              employees={employeeOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
