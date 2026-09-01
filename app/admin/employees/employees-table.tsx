"use client";

import { useState } from "react";
import { Link2, Pencil, Power, RefreshCw } from "lucide-react";

import type { Employee } from "@prisma/client";
import { toggleEmployeeActive, regenerateEmployeeAccessToken } from "./actions";
import { DeleteEmployeeButton } from "./delete-employee-button";
import { EmployeeForm } from "./employee-form";
import { formatShortDateIT } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { ABSENCE_TYPE_LABELS_IT } from "@/lib/validation/absence";
import { Badge } from "@/components/ui/badge";
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

// navigator.clipboard requires a secure context (HTTPS or localhost), so it's
// unavailable when the admin opens the app over plain HTTP via a LAN IP
// (needed to hand out employee links testable from a phone). Fall back to
// the older execCommand path, which still works over plain HTTP.
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path below
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let success = false;
  try {
    success = document.execCommand("copy");
  } catch {
    success = false;
  }
  document.body.removeChild(textarea);
  return success;
}

interface CurrentAbsence {
  type: string;
  endDate: Date;
}

export function EmployeesTable({
  employees,
  currentAbsenceByEmployeeId = {},
}: {
  employees: Employee[];
  currentAbsenceByEmployeeId?: Record<string, CurrentAbsence>;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Telefono</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead className="text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <EmployeeRow
            key={employee.id}
            employee={employee}
            currentAbsence={currentAbsenceByEmployeeId[employee.id]}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function EmployeeRow({
  employee,
  currentAbsence,
}: {
  employee: Employee;
  currentAbsence?: CurrentAbsence;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function handleCopyLink() {
    const url = `${window.location.origin}/app/${employee.accessToken}`;
    const success = await copyToClipboard(url);
    setCopied(success);
    setCopyFailed(!success);
    setTimeout(() => {
      setCopied(false);
      setCopyFailed(false);
    }, 2000);
  }

  async function handleRegenerate() {
    await regenerateEmployeeAccessToken(employee.id);
  }

  async function handleToggleActive() {
    await toggleEmployeeActive(employee.id);
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {employee.firstName} {employee.lastName}
      </TableCell>
      <TableCell>{employee.phone ?? "—"}</TableCell>
      <TableCell>{employee.email ?? "—"}</TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge active={employee.active} />
          {currentAbsence && (
            <Badge
              variant="outline"
              className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-500"
            >
              {ABSENCE_TYPE_LABELS_IT[currentAbsence.type] ?? "Assente"} fino al{" "}
              {formatShortDateIT(currentAbsence.endDate)}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {/* Fixed width, always rendered — reserves its space up front so
              the feedback text appearing/disappearing never shifts the
              buttons next to it or resizes the column. */}
          <span
            className={cn(
              "w-32 shrink-0 self-center truncate text-right text-xs",
              copied && "text-muted-foreground",
              copyFailed && "text-destructive",
              !copied && !copyFailed && "invisible"
            )}
          >
            {copied ? "Copiato!" : copyFailed ? "Copia non riuscita." : " "}
          </span>
          <EmployeeForm
            employee={{
              id: employee.id,
              firstName: employee.firstName,
              lastName: employee.lastName,
              phone: employee.phone ?? undefined,
              email: employee.email ?? undefined,
              notes: employee.notes ?? undefined,
            }}
            trigger={
              <Button variant="ghost" size="icon" title="Modifica">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <Button variant="ghost" size="icon" title="Copia link personale" onClick={handleCopyLink}>
            <Link2 className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon" title="Rigenera link personale">
                <RefreshCw className="h-4 w-4" />
              </Button>
            }
            title="Rigenerare il link personale?"
            description="Il vecchio link smetterà immediatamente di funzionare. Usalo solo se il link è stato condiviso per errore o il dipendente ha perso l'accesso."
            confirmLabel="Rigenera"
            onConfirm={handleRegenerate}
          />
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                title={employee.active ? "Disattiva" : "Riattiva"}
              >
                <Power className="h-4 w-4" />
              </Button>
            }
            title={employee.active ? "Disattivare il dipendente?" : "Riattivare il dipendente?"}
            description={
              employee.active
                ? `${employee.firstName} ${employee.lastName} non sarà più selezionabile per nuove attività e il suo link personale smetterà di funzionare.`
                : undefined
            }
            variant={employee.active ? "destructive" : "default"}
            confirmLabel={employee.active ? "Disattiva" : "Riattiva"}
            onConfirm={handleToggleActive}
          />
          <DeleteEmployeeButton
            employeeId={employee.id}
            employeeName={`${employee.firstName} ${employee.lastName}`}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
