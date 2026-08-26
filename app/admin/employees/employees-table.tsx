"use client";

import { useState } from "react";
import { Link2, Pencil, Power, RefreshCw } from "lucide-react";

import type { Employee } from "@prisma/client";
import { toggleEmployeeActive, regenerateEmployeeAccessToken } from "./actions";
import { EmployeeForm } from "./employee-form";
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

export function EmployeesTable({ employees }: { employees: Employee[] }) {
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
          <EmployeeRow key={employee.id} employee={employee} />
        ))}
      </TableBody>
    </Table>
  );
}

function EmployeeRow({ employee }: { employee: Employee }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function handleCopyLink() {
    const url = `${window.location.origin}/app/${employee.accessToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyFailed(false);
      setCopied(true);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
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
        <StatusBadge active={employee.active} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
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
          {copied && <span className="self-center text-xs text-muted-foreground">Copiato!</span>}
          {copyFailed && (
            <span className="self-center text-xs text-destructive">Copia non riuscita.</span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
