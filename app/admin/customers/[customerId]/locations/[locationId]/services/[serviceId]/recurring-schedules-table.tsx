"use client";

import { Pencil, Power } from "lucide-react";

import type { RecurringSchedule } from "@prisma/client";
import { DAY_OF_WEEK_LABELS_IT, dateValueToDateString, timeValueToTimeString } from "@/lib/dates";
import { toggleRecurringScheduleActive } from "./actions";
import { RecurringScheduleForm } from "./recurring-schedule-form";
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

export function RecurringSchedulesTable({
  customerId,
  locationId,
  serviceId,
  schedules,
}: {
  customerId: string;
  locationId: string;
  serviceId: string;
  schedules: RecurringSchedule[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Giorno</TableHead>
          <TableHead>Orario</TableHead>
          <TableHead>Durata</TableHead>
          <TableHead>Validità</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead className="text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map((schedule) => {
          const startTime = timeValueToTimeString(schedule.startTime);
          const effectiveFrom = dateValueToDateString(schedule.effectiveFrom);
          const effectiveUntil = schedule.effectiveUntil
            ? dateValueToDateString(schedule.effectiveUntil)
            : undefined;

          return (
            <TableRow key={schedule.id}>
              <TableCell className="font-medium">
                {DAY_OF_WEEK_LABELS_IT[schedule.dayOfWeek]}
              </TableCell>
              <TableCell>{startTime}</TableCell>
              <TableCell>{schedule.estimatedDurationMinutes} min</TableCell>
              <TableCell>
                {effectiveFrom}
                {effectiveUntil ? ` → ${effectiveUntil}` : " → indeterminato"}
              </TableCell>
              <TableCell>
                <StatusBadge active={schedule.active} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <RecurringScheduleForm
                    customerId={customerId}
                    locationId={locationId}
                    serviceId={serviceId}
                    schedule={{
                      id: schedule.id,
                      dayOfWeek: schedule.dayOfWeek,
                      startTime,
                      estimatedDurationMinutes: schedule.estimatedDurationMinutes,
                      effectiveFrom,
                      effectiveUntil,
                    }}
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
                        title={schedule.active ? "Disattiva" : "Riattiva"}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    }
                    title={
                      schedule.active ? "Disattivare la ricorrenza?" : "Riattivare la ricorrenza?"
                    }
                    description={
                      schedule.active
                        ? "Non verranno più generate nuove attività da questa ricorrenza. Le attività già generate restano invariate."
                        : undefined
                    }
                    variant={schedule.active ? "destructive" : "default"}
                    confirmLabel={schedule.active ? "Disattiva" : "Riattiva"}
                    onConfirm={async () => {
                      await toggleRecurringScheduleActive(
                        customerId,
                        locationId,
                        serviceId,
                        schedule.id
                      );
                    }}
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
