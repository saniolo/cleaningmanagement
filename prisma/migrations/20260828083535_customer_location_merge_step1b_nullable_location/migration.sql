-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_locationId_fkey";

-- AlterTable
ALTER TABLE "services" ALTER COLUMN "locationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
