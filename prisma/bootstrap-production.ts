// One-time production bootstrap: creates the Company + the first ADMIN
// user. Deliberately a SEPARATE script from prisma/seed.ts (the realistic
// dev demo dataset with fake "Condominio Verdi"/"Mario Rossi" data) —
// running that against production would put fabricated customers and
// employees into a real account. This script creates nothing but the
// company and one admin; every other record is created by that admin
// through the app itself.
//
// Usage (once, after the first `prisma migrate deploy` against the
// production database):
//   BOOTSTRAP_COMPANY_NAME="..." BOOTSTRAP_ADMIN_EMAIL="..." \
//   BOOTSTRAP_ADMIN_PASSWORD="..." DATABASE_URL="<production URL>" \
//   npx tsx prisma/bootstrap-production.ts
//
// Idempotent: if a user with that email already exists, it does nothing
// rather than erroring, so re-running it by mistake is harmless.
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} è obbligatoria per il bootstrap di produzione.`);
  }
  return value;
}

async function main() {
  const companyName = requireEnv("BOOTSTRAP_COMPANY_NAME");
  const adminEmail = requireEnv("BOOTSTRAP_ADMIN_EMAIL");
  const adminPassword = requireEnv("BOOTSTRAP_ADMIN_PASSWORD");

  if (adminPassword.length < 8) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD deve avere almeno 8 caratteri.");
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    console.log(`\nUn utente con email ${adminEmail} esiste già. Nessuna azione eseguita.\n`);
    return;
  }

  const company = await prisma.company.create({ data: { name: companyName } });
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.create({
    data: {
      companyId: company.id,
      email: adminEmail,
      password: passwordHash,
      role: Role.ADMIN,
      // No forced-password-change flow exists in the app yet (the field is
      // schema-only right now — see the Milestone 9 report's FUTURE
      // IMPROVEMENT note), so this only records who set the password, not
      // an enforced requirement.
      mustChangePassword: false,
    },
  });

  console.log("\nBootstrap di produzione completato.");
  console.log(`Azienda: ${companyName} (${company.id})`);
  console.log(`Admin:   ${adminEmail}`);
  console.log("\nNessun dipendente/cliente/servizio è stato creato: usa l'app per inserirli.\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
