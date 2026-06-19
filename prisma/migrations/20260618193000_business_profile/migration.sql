CREATE TABLE "BusinessProfile" (
  "id" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "tagline" TEXT NOT NULL,
  "logoUrl" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "whatsappUrl" TEXT NOT NULL,
  "instagramUrl" TEXT NOT NULL,
  "primaryColor" TEXT NOT NULL DEFAULT '#0F5EF7',
  "primaryDark" TEXT NOT NULL DEFAULT '#082F8B',
  "accentColor" TEXT NOT NULL DEFAULT '#22C55E',
  "accentSoft" TEXT NOT NULL DEFAULT '#EAFBF1',
  "backgroundColor" TEXT NOT NULL DEFAULT '#F6F9FF',
  "surfaceColor" TEXT NOT NULL DEFAULT '#FFFFFF',
  "textColor" TEXT NOT NULL DEFAULT '#082F8B',
  "mutedColor" TEXT NOT NULL DEFAULT '#64748B',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);
