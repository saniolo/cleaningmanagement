-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "freedByAbsenceId" TEXT;

-- CreateIndex
CREATE INDEX "assignments_freedByAbsenceId_idx" ON "assignments"("freedByAbsenceId");

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_freedByAbsenceId_fkey" FOREIGN KEY ("freedByAbsenceId") REFERENCES "absence_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
