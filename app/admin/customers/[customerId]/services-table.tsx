"use client";

import { Pencil, Power } from "lucide-react";

import type { RecurringSchedule, Service } from "@prisma/client";
import { DAY_OF_WEEK_SHORT_LABELS_IT } from "@/lib/dates";
import { toggleServiceActive } from "./actions";
import { ServiceForm } from "./service-form";
import { DeleteServiceButton } from "./delete-service-button";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Monday-first display order, mapped to the Sunday=0..Saturday=6 values
// RecurringSchedule.dayOfWeek actually stores.
const DAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function ServicesTable({
  customerId,
  services,
}: {
  customerId: string;
  services: (Service & { recurringSchedules: RecurringSchedule[] })[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Giorni</TableHead>
          <TableHead>Durata stimata</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead className="text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((service) => {
          const activeSchedules = service.recurringSchedules.filter((s) => s.active);
          const activeDays = activeSchedules.map((s) => s.dayOfWeek);
          const sortedActiveDays = DAY_DISPLAY_ORDER.filter((d) => activeDays.includes(d));

          return (
            <TableRow key={service.id}>
              <TableCell className="font-medium">{service.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {sortedActiveDays.length === 0
                  ? "—"
                  : sortedActiveDays.map((d) => DAY_OF_WEEK_SHORT_LABELS_IT[d]).join(", ")}
              </TableCell>
              <TableCell>{service.estimatedDurationMinutes} min</TableCell>
              <TableCell>
                <StatusBadge active={service.active} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <ServiceForm
                    customerId={customerId}
                    service={{
                      id: service.id,
                      name: service.name,
                      description: service.description ?? undefined,
                      estimatedDurationMinutes: service.estimatedDurationMinutes,
                      operationalNotes: service.operationalNotes ?? undefined,
                    }}
                    activeDays={activeDays}
                    trigger={
                      <Button variant="ghost" size="icon" title="Modifica">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        title={service.active ? "Disattiva" : "Riattiva"}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    }
                    title={service.active ? "Disattivare il servizio?" : "Riattivare il servizio?"}
                    description={
                      service.active
                        ? `${service.name} non sarà più selezionabile per nuove pianificazioni.`
                        : undefined
                    }
                    variant={service.active ? "destructive" : "default"}
                    confirmLabel={service.active ? "Disattiva" : "Riattiva"}
                    onConfirm={async () => {
                      await toggleServiceActive(customerId, service.id);
                    }}
                  />
                  <DeleteServiceButton
                    customerId={customerId}
                    serviceId={service.id}
                    serviceName={service.name}
                  />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
