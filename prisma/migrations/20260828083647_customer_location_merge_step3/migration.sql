/*
  Warnings:

  - You are about to drop the column `locationId` on the `services` table. All the data in the column will be lost.
  - You are about to drop the `locations` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `addressLine` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `city` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `postalCode` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `province` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `customerId` on table `services` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "locations" DROP CONSTRAINT "locations_customerId_fkey";

-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_customerId_fkey";

-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_locationId_fkey";

-- DropIndex
DROP INDEX "services_locationId_idx";

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "addressLine" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "postalCode" SET NOT NULL,
ALTER COLUMN "province" SET NOT NULL;

-- AlterTable
ALTER TABLE "services" DROP COLUMN "locationId",
ALTER COLUMN "customerId" SET NOT NULL;

-- DropTable
DROP TABLE "locations";

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
