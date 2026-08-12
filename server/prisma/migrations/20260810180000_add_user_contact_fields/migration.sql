-- AlterTable
-- Both columns are nullable with no default, so every existing row stays valid
-- and no backfill is required. Purely additive: nothing is dropped or renamed,
-- and the expression index "User_email_lower_key" is untouched.
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "whatsapp" TEXT;
