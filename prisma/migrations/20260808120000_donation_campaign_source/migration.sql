-- Distinguish fundraiser vs general gifts and where each donation came from.
-- Existing rows are treated as the August drive (legacy) so fundraiser totals stay correct.

ALTER TABLE "Donation" ADD COLUMN "campaign" TEXT NOT NULL DEFAULT 'august_fundraiser';
ALTER TABLE "Donation" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "Donation" ADD COLUMN "sourceDetail" TEXT;
