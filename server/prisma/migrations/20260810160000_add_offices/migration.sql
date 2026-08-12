-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameDe" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "descriptionDe" TEXT,
    "governorate" "Governorate" NOT NULL,
    "city" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- One office per owner. The create endpoint answers 409 by catching the
-- violation of this constraint, so it must never be relaxed to a plain index.
CREATE UNIQUE INDEX "Office_ownerId_key" ON "Office"("ownerId");

-- CreateIndex
CREATE INDEX "Office_governorate_idx" ON "Office"("governorate");

-- CreateIndex
CREATE INDEX "Office_createdAt_idx" ON "Office"("createdAt");

-- AlterTable
-- Nullable with no default, so every existing listing stays valid with no
-- office and no backfill is required.
ALTER TABLE "Property" ADD COLUMN     "officeId" TEXT;

-- CreateIndex
CREATE INDEX "Property_officeId_idx" ON "Property"("officeId");

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;
