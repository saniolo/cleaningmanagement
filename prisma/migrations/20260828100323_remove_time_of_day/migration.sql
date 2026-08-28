-- Assignment: replace startTime/endTime with a single durationMinutes,
-- computed from the existing interval before the source columns are dropped.
ALTER TABLE "assignments" ADD COLUMN "durationMinutes" INTEGER;
UPDATE "assignments" SET "durationMinutes" = ROUND(EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60);
ALTER TABLE "assignments" ALTER COLUMN "durationMinutes" SET NOT NULL;
ALTER TABLE "assignments" DROP COLUMN "startTime";
ALTER TABLE "assignments" DROP COLUMN "endTime";

-- RecurringSchedule: drop startTime — duration is already tracked
-- independently via estimatedDurationMinutes, nothing to preserve.
ALTER TABLE "recurring_schedules" DROP COLUMN "startTime";
