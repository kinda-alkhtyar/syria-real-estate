-- CreateIndex
CREATE INDEX "Property_ownerId_updatedAt_idx" ON "Property"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "Property_status_createdAt_idx" ON "Property"("status", "createdAt");
