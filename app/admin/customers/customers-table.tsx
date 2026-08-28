"use client";

import Link from "next/link";
import { ArrowRight, Pencil, Power } from "lucide-react";

import type { Customer } from "@prisma/client";
import { toggleCustomerActive } from "./actions";
import { CustomerForm } from "./customer-form";
import { DeleteCustomerButton } from "./delete-customer-button";
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

type CustomerWithCount = Customer & { _count: { services: number } };

export function CustomersTable({ customers }: { customers: CustomerWithCount[] }) {
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
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell className="font-medium">{customer.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {customer.addressLine}, {customer.city}
            </TableCell>
            <TableCell>{customer._count.services}</TableCell>
            <TableCell>
              <StatusBadge active={customer.active} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <CustomerForm
                  customer={{
                    id: customer.id,
                    name: customer.name,
                    addressLine: customer.addressLine,
                    city: customer.city,
                    postalCode: customer.postalCode,
                    province: customer.province,
                    notes: customer.notes ?? undefined,
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
                      title={customer.active ? "Disattiva" : "Riattiva"}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  }
                  title={customer.active ? "Disattivare il cliente?" : "Riattivare il cliente?"}
                  description={
                    customer.active
                      ? `${customer.name} non sarà più selezionabile per nuovi servizi.`
                      : undefined
                  }
                  variant={customer.active ? "destructive" : "default"}
                  confirmLabel={customer.active ? "Disattiva" : "Riattiva"}
                  onConfirm={async () => {
                    await toggleCustomerActive(customer.id);
                  }}
                />
                <Button variant="ghost" size="icon" title="Apri" asChild>
                  <Link href={`/admin/customers/${customer.id}`}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <DeleteCustomerButton customerId={customer.id} customerName={customer.name} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
