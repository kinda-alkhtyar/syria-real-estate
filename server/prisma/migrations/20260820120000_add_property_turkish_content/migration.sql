-- AlterTable
-- Both columns are nullable with no default, so every existing row stays valid
-- and no backfill is required to apply this. Purely additive: nothing is
-- dropped or renamed, and the row level security policies on "Property" are
-- untouched because they never enumerate columns.
ALTER TABLE "Property" ADD COLUMN     "titleTr" TEXT,
ADD COLUMN     "descriptionTr" TEXT;
