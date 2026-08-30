"use client";

import { useState } from "react";

import { confirmAssignment, rejectAssignment } from "@/app/app/[token]/confirm-actions";
import { Button } from "@/components/ui/button";

export function ConfirmAssignmentButton({ token, id }: { token: string; id: string }) {
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReject() {
    setLoading("reject");
    setError(null);
    const result = await rejectAssignment(token, id);
    setLoading(null);
    if (!result.success) setError(result.error);
  }

  async function handleAccept() {
    setLoading("accept");
    setError(null);
    const result = await confirmAssignment(token, id);
    setLoading(null);
    if (!result.success) setError(result.error);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={handleReject}
          disabled={loading !== null}
        >
          {loading === "reject" ? "Rifiuto..." : "Rifiuta"}
        </Button>
        <Button size="sm" className="flex-1" onClick={handleAccept} disabled={loading !== null}>
          {loading === "accept" ? "Accetto..." : "Accetta"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
