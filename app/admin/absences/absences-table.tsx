"use client";

import { approveAbsenceRequest, rejectAbsenceRequest } from "./actions";
import { AbsenceStatusBadge } from "@/components/shared/absence-status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateRangeIT } from "@/lib/dates";
import { ABSENCE_TYPE_LABELS_IT } from "@/lib/validation/absence";

interface AbsenceRow {
  id: string;
  type: string;
  startDate: Date;
  endDate: Date;
  notes: string | null;
  status: string;
  employee: { firstName: string; lastName: string };
}

export function AbsencesTable({
  absences,
  actionable,
}: {
  absences: AbsenceRow[];
  actionable: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Dipendente</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Periodo</TableHead>
          <TableHead>Note</TableHead>
          <TableHead>Stato</TableHead>
          {actionable && <TableHead className="text-right">Azioni</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {absences.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="font-medium">
              {a.employee.firstName} {a.employee.lastName}
            </TableCell>
            <TableCell>{ABSENCE_TYPE_LABELS_IT[a.type]}</TableCell>
            <TableCell>{formatDateRangeIT(a.startDate, a.endDate)}</TableCell>
            <TableCell className="max-w-[220px] truncate">{a.notes ?? "—"}</TableCell>
            <TableCell>
              <AbsenceStatusBadge status={a.status} />
            </TableCell>
            {actionable && (
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <ConfirmDialog
                    trigger={<Button size="sm">Approva</Button>}
                    title="Approvare l'assenza?"
                    description={`Le attività già assegnate a ${a.employee.firstName} ${a.employee.lastName} in questo periodo diventeranno da riassegnare. L'attività non viene mai eliminata.`}
                    confirmLabel="Approva"
                    onConfirm={async () => {
                      await approveAbsenceRequest(a.id);
                    }}
                  />
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="outline">
                        Rifiuta
                      </Button>
                    }
                    title="Rifiutare l'assenza?"
                    confirmLabel="Rifiuta"
                    variant="destructive"
                    onConfirm={async () => {
                      await rejectAbsenceRequest(a.id);
                    }}
                  />
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
