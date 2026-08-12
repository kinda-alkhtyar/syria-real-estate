-- Listing moderation, cycle 1. Purely additive: no existing row changes value
-- and no column is dropped, so an already deployed database keeps serving while
-- this is applied.

-- Two new listing states. Positioned so the database enum order matches
-- schema.prisma: PENDING_REVIEW sits between DRAFT and AVAILABLE, REJECTED
-- between RENTED and ARCHIVED.
ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW' BEFORE 'AVAILABLE';
ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'REJECTED' BEFORE 'ARCHIVED';

-- Nullable by design: only a rejected listing carries a reason, and the column
-- is cleared again on resubmission or approval.
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
