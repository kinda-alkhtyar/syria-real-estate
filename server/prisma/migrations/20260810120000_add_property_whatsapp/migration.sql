-- AlterTable
-- Nullable with no default, so every existing row keeps working with an empty
-- number and no backfill is required.
ALTER TABLE "Property" ADD COLUMN     "whatsapp" TEXT;
