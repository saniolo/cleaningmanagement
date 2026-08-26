"use client";

import Link from "next/link";
import { ArrowRight, Pencil, Power } from "lucide-react";

import type { Location } from "@prisma/client";
import { toggleLocationActive } from "./actions";
import { LocationForm } from "./location-form";
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

type LocationWithCount = Location & { _count: { services: number } };

export function LocationsTable({
  customerId,
  locations,
}: {
  customerId: string;
  locations: LocationWithCount[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Indirizzo</TableHead>
          <TableHead>Servizi</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead className="text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {locations.map((location) => (
          <TableRow key={location.id}>
            <TableCell className="font-medium">{location.name}</TableCell>
            <TableCell>
              {location.addressLine}, {location.city} ({location.province})
            </TableCell>
            <TableCell>{location._count.services}</TableCell>
            <TableCell>
              <StatusBadge active={location.active} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <LocationForm
                  customerId={customerId}
                  location={{
                    id: location.id,
                    name: location.name,
                    addressLine: location.addressLine,
                    city: location.city,
                    postalCode: location.postalCode,
                    province: location.province,
                    notes: location.notes ?? undefined,
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
                      title={location.active ? "Disattiva" : "Riattiva"}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  }
                  title={location.active ? "Disattivare la location?" : "Riattivare la location?"}
                  description={
                    location.active
                      ? `${location.name} e i suoi servizi non saranno più selezionabili per nuove attività.`
                      : undefined
                  }
                  variant={location.active ? "destructive" : "default"}
                  confirmLabel={location.active ? "Disattiva" : "Riattiva"}
                  onConfirm={async () => {
                    await toggleLocationActive(customerId, location.id);
                  }}
                />
                <Button variant="ghost" size="icon" title="Apri" asChild>
                  <Link href={`/admin/customers/${customerId}/locations/${location.id}`}>
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
