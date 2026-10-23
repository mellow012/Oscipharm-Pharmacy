CREATE TYPE "NewsType" AS ENUM ('NEWS', 'EVENT');
CREATE TYPE "NewsStatus" AS ENUM ('PREVIEW', 'PUBLISHED');

ALTER TABLE "News"
  ADD COLUMN "type" "NewsType" NOT NULL DEFAULT 'NEWS',
  ADD COLUMN "status" "NewsStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "eventStartsAt" TIMESTAMP(3),
  ADD COLUMN "eventEndsAt" TIMESTAMP(3),
  ADD COLUMN "eventLocation" TEXT;

ALTER TABLE "News" ALTER COLUMN "status" SET DEFAULT 'PREVIEW';

ALTER TABLE "News" ADD CONSTRAINT "News_event_fields_check" CHECK (
  ("type" = 'EVENT' AND "eventStartsAt" IS NOT NULL AND ("eventEndsAt" IS NULL OR "eventEndsAt" >= "eventStartsAt"))
  OR ("type" = 'NEWS' AND "eventStartsAt" IS NULL AND "eventEndsAt" IS NULL AND "eventLocation" IS NULL)
);

ALTER TYPE "AuditAction" ADD VALUE 'NEWS_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'NEWS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'NEWS_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'NEWS_UNPUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'NEWS_DELETED';