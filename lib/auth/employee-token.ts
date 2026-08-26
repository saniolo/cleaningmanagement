import { randomBytes } from "crypto";

// Opaque, unguessable token backing an employee's personal dashboard link
// (/app/[token]) — see Employee.accessToken in prisma/schema.prisma and the
// "Accesso dipendenti via link personale" section of the approved plan.
// Deliberately NOT a cuid()/uuid(): those are designed for uniqueness, not
// secrecy, and can be predictable enough to enumerate.
export function generateEmployeeAccessToken(): string {
  return randomBytes(32).toString("hex");
}
