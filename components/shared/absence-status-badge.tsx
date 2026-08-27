import { Badge } from "@/components/ui/badge";
import { ABSENCE_STATUS_LABELS_IT } from "@/lib/validation/absence";

const VARIANT_BY_STATUS: Record<string, "secondary" | "default" | "destructive"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

export function AbsenceStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANT_BY_STATUS[status] ?? "secondary"}>
      {ABSENCE_STATUS_LABELS_IT[status] ?? status}
    </Badge>
  );
}
