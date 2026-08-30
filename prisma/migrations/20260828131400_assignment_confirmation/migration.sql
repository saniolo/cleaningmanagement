-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false;
