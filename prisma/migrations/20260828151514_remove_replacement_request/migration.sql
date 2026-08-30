/*
  Warnings:

  - You are about to drop the `replacement_requests` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "replacement_requests" DROP CONSTRAINT "replacement_requests_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "replacement_requests" DROP CONSTRAINT "replacement_requests_proposedEmployeeId_fkey";

-- DropTable
DROP TABLE "replacement_requests";

-- DropEnum
DROP TYPE "ReplacementStatus";
