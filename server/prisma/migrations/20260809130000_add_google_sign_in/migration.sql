-- AlterTable
ALTER TABLE "User" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'PASSWORD',
ADD COLUMN     "google_sub" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_google_sub_key" ON "User"("google_sub");
