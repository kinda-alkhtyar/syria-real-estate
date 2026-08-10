-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "videoMimeType" TEXT,
ADD COLUMN     "videoSizeBytes" INTEGER,
ADD COLUMN     "videoStoragePath" TEXT,
ADD COLUMN     "videoUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Property_videoStoragePath_key" ON "Property"("videoStoragePath");
