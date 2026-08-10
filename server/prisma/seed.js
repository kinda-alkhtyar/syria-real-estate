import 'dotenv/config'

import { PrismaPg } from '@prisma/adapter-pg'

import {
  Currency,
  Governorate,
  ListingStatus,
  PrismaClient,
  PropertyType,
  TransactionType,
  UserRole,
} from '../src/generated/prisma/client.ts'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to seed PostgreSQL.')
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

const sampleOwner = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'sample-catalog-owner@example.invalid',
  name: 'Sample catalog owner',
  role: UserRole.OWNER,
}

const properties = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    slug: 'damascus-courtyard',
    titleEn: 'Restored courtyard home',
    titleAr: 'منزل دمشقي مجدد',
    titleDe: 'Restauriertes Hofhaus',
    descriptionEn:
      'A carefully restored courtyard residence combining traditional Damascene stonework with comfortable contemporary living spaces.',
    descriptionAr:
      'منزل ذو باحة جرى ترميمه بعناية، يجمع بين الحجر الدمشقي التقليدي ومساحات المعيشة العصرية المريحة.',
    descriptionDe:
      'Ein sorgfältig restauriertes Hofhaus, das traditionelle Damaszener Steinarbeiten mit komfortablen modernen Wohnräumen verbindet.',
    transaction: TransactionType.BUY,
    propertyType: PropertyType.HOUSE,
    status: ListingStatus.AVAILABLE,
    price: '245000.00',
    currency: Currency.USD,
    governorate: Governorate.DAMASCUS,
    city: 'Damascus',
    district: 'Old Damascus',
    bedrooms: 4,
    bathrooms: 3,
    area: '310.00',
    featured: true,
    image: {
      url: '/assets/properties/damascus-courtyard.jpg',
      altEn: 'Limestone courtyard with citrus trees and outdoor seating',
      altAr: 'باحة حجرية مع أشجار حمضيات وجلسة خارجية',
      altDe: 'Kalksteinhof mit Zitrusbäumen und Sitzbereich',
    },
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    slug: 'latakia-apartment',
    titleEn: 'Mediterranean-view apartment',
    titleAr: 'شقة بإطلالة على المتوسط',
    titleDe: 'Apartment mit Mittelmeerblick',
    descriptionEn:
      'A bright coastal apartment with generous living areas, modern finishes, and an open view toward the Mediterranean.',
    descriptionAr:
      'شقة ساحلية مضيئة بمساحات معيشة رحبة وتشطيبات حديثة وإطلالة مفتوحة نحو البحر المتوسط.',
    descriptionDe:
      'Eine helle Küstenwohnung mit großzügigen Wohnbereichen, moderner Ausstattung und freiem Blick auf das Mittelmeer.',
    transaction: TransactionType.RENT,
    propertyType: PropertyType.APARTMENT,
    status: ListingStatus.AVAILABLE,
    price: '950.00',
    currency: Currency.USD,
    governorate: Governorate.LATAKIA,
    city: 'Latakia',
    district: 'Al-Ziraa',
    bedrooms: 2,
    bathrooms: 2,
    area: '145.00',
    featured: true,
    image: {
      url: '/assets/properties/latakia-apartment.jpg',
      altEn: 'Bright apartment living room overlooking the Mediterranean',
      altAr: 'غرفة معيشة مضيئة تطل على البحر المتوسط',
      altDe: 'Helles Wohnzimmer mit Blick auf das Mittelmeer',
    },
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    slug: 'aleppo-villa',
    titleEn: 'Contemporary garden villa',
    titleAr: 'فيلا عصرية بحديقة',
    titleDe: 'Moderne Gartenvilla',
    descriptionEn:
      'A composed garden villa with private outdoor spaces, warm local materials, and flexible rooms for shorter stays.',
    descriptionAr:
      'فيلا هادئة بحديقة ومساحات خارجية خاصة ومواد محلية دافئة وغرف مرنة للإقامات القصيرة.',
    descriptionDe:
      'Eine ruhige Gartenvilla mit privaten Außenbereichen, warmen lokalen Materialien und flexiblen Räumen für kürzere Aufenthalte.',
    transaction: TransactionType.STAY,
    propertyType: PropertyType.VILLA,
    status: ListingStatus.RESERVED,
    price: '135.00',
    currency: Currency.USD,
    governorate: Governorate.ALEPPO,
    city: 'Aleppo',
    district: 'New Aleppo',
    bedrooms: 3,
    bathrooms: 2,
    area: '220.00',
    featured: true,
    image: {
      url: '/assets/properties/aleppo-villa.jpg',
      altEn: 'Modern limestone villa surrounded by a landscaped garden',
      altAr: 'فيلا حجرية عصرية تحيط بها حديقة منسقة',
      altDe: 'Moderne Kalksteinvilla in einem angelegten Garten',
    },
  },
]

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: sampleOwner.email },
    update: {
      name: sampleOwner.name,
      role: sampleOwner.role,
    },
    create: sampleOwner,
  })

  for (const { image, ...property } of properties) {
    const savedProperty = await prisma.property.upsert({
      where: { slug: property.slug },
      update: {
        ...property,
        ownerId: owner.id,
      },
      create: {
        ...property,
        ownerId: owner.id,
      },
    })

    await prisma.propertyImage.upsert({
      where: {
        propertyId_sortOrder: {
          propertyId: savedProperty.id,
          sortOrder: 0,
        },
      },
      update: image,
      create: {
        ...image,
        propertyId: savedProperty.id,
        sortOrder: 0,
      },
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
