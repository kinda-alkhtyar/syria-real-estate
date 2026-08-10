-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'RENT', 'STAY');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'VILLA', 'LAND', 'COMMERCIAL', 'OFFICE');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'SYP');

-- CreateEnum
CREATE TYPE "Governorate" AS ENUM ('DAMASCUS', 'RIF_DIMASHQ', 'ALEPPO', 'LATAKIA', 'HOMS', 'HAMA', 'IDLIB', 'TARTUS', 'DARAA', 'AS_SUWAYDA', 'RAQQA', 'AL_HASAKAH', 'DEIR_EZ_ZOR', 'QUNEITRA');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleDe" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionAr" TEXT,
    "descriptionDe" TEXT,
    "transaction" "TransactionType" NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "price" DECIMAL(14,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "governorate" "Governorate" NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "neighborhood" TEXT,
    "address" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "area" DECIMAL(10,2) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(10,6),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyImage" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "altEn" TEXT,
    "altAr" TEXT,
    "altDe" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- CreateIndex
CREATE INDEX "Property_ownerId_idx" ON "Property"("ownerId");

-- CreateIndex
CREATE INDEX "Property_status_featured_idx" ON "Property"("status", "featured");

-- CreateIndex
CREATE INDEX "Property_transaction_propertyType_governorate_idx" ON "Property"("transaction", "propertyType", "governorate");

-- CreateIndex
CREATE INDEX "Property_governorate_city_district_idx" ON "Property"("governorate", "city", "district");

-- CreateIndex
CREATE INDEX "Property_price_idx" ON "Property"("price");

-- CreateIndex
CREATE INDEX "Property_createdAt_idx" ON "Property"("createdAt");

-- CreateIndex
CREATE INDEX "PropertyImage_propertyId_idx" ON "PropertyImage"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyImage_propertyId_sortOrder_key" ON "PropertyImage"("propertyId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
