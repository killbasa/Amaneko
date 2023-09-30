/*
  Warnings:

  - Made the column `relayMods` on table `Guild` required. This step will fail if there are existing NULL values in that column.
  - Made the column `relayTranslations` on table `Guild` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Guild" ALTER COLUMN "relayMods" SET NOT NULL,
ALTER COLUMN "relayMods" SET DEFAULT true,
ALTER COLUMN "relayTranslations" SET NOT NULL,
ALTER COLUMN "relayTranslations" SET DEFAULT true;
