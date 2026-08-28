-- CreateTable
CREATE TABLE "activity_templates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "estimatedDurationMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_templates_companyId_idx" ON "activity_templates"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "activity_templates_companyId_name_key" ON "activity_templates"("companyId", "name");

-- AddForeignKey
ALTER TABLE "activity_templates" ADD CONSTRAINT "activity_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
