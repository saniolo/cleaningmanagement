"use client";

import Link from "next/link";
import { ArrowRight, Pencil, Power } from "lucide-react";

import type { Service } from "@prisma/client";
import { toggleServiceActive } from "./actions";
import { ServiceForm } from "./service-form";
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

export function ServicesTable({
  customerId,
  locationId,
  services,
}: {
  customerId: string;
  locationId: string;
  services: Service[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Durata stimata</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead className="text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((service) => (
          <TableRow key={service.id}>
            <TableCell className="font-medium">{service.name}</TableCell>
            <TableCell>{service.estimatedDurationMinutes} min</TableCell>
            <TableCell>
              <StatusBadge active={service.active} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <ServiceForm
                  customerId={customerId}
                  locationId={locationId}
                  service={{
                    id: service.id,
                    name: service.name,
                    description: service.description ?? undefined,
                    estimatedDurationMinutes: service.estimatedDurationMinutes,
                    operationalNotes: service.operationalNotes ?? undefined,
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
                    await toggleServiceActive(customerId, locationId, service.id);
                  }}
                />
                <Button variant="ghost" size="icon" title="Apri" asChild>
                  <Link
                    href={`/admin/customers/${customerId}/locations/${locationId}/services/${service.id}`}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
