-- AlterTable
ALTER TABLE "PropertyImage" ADD COLUMN     "height" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "storagePath" TEXT,
ADD COLUMN     "width" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "PropertyImage_storagePath_key" ON "PropertyImage"("storagePath");
