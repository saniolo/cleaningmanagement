import type { ReactNode } from "react";
import { Mail, AlertTriangle } from "lucide-react";

import { Card } from "@/components/ui/card";

interface AccountCardProps {
  name: string;
  initials: string;
  email: string;
  roleLabel: string;
  mustChangePassword?: boolean;
  /** The existing AdminProfileForm, triggered by a full-width outline button. */
  editSlot: ReactNode;
}

export function AccountCard({
  name,
  initials,
  email,
  roleLabel,
  mustChangePassword = false,
  editSlot,
}: AccountCardProps) {
  return (
    <Card className="flex h-full flex-col rounded-2xl border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <h2 className="text-sm font-semibold text-slate-900">Il tuo account</h2>

      <div className="mt-4 flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
          {initials}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{name}</div>
          <div className="truncate text-xs text-slate-500">{roleLabel}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate">{email}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
          {roleLabel}
        </span>
        {mustChangePassword && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            Cambia password
          </span>
        )}
      </div>

      <div className="mt-auto pt-4">{editSlot}</div>
    </Card>
  );
}
