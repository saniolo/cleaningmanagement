// Shared result shape for admin Server Actions — lets forms show a plain
// Italian error message (PROJECT_SPEC.md section 30) instead of a raw
// exception, without a bespoke error type per action.
export type ActionResult<T = undefined> =
  { success: true; data: T } | { success: false; error: string };
