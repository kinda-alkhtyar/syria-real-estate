-- Adds the Aleppo Countryside region to the Governorate enum.
-- Positioned before LATAKIA so the database enum order matches schema.prisma.
ALTER TYPE "Governorate" ADD VALUE IF NOT EXISTS 'RIF_ALEPPO' BEFORE 'LATAKIA';
