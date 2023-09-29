/*
  Warnings:

  - You are about to drop the column `message` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the `Channel` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[channelId,guildId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_channelId_fkey";

-- DropForeignKey
ALTER TABLE "Video" DROP CONSTRAINT "Video_channelId_fkey";

-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "relayMods" BOOLEAN,
ADD COLUMN     "relayTranslations" BOOLEAN,
ADD COLUMN     "scheduleChannelId" TEXT,
ADD COLUMN     "scheduleMessageId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "message",
ADD COLUMN     "communityPostChannelId" TEXT,
ADD COLUMN     "communityPostRoleId" TEXT,
ADD COLUMN     "relayChannelId" TEXT;

-- DropTable
DROP TABLE "Channel";

-- CreateTable
CREATE TABLE "Blacklist" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,

    CONSTRAINT "Blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolodexChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "englishName" TEXT,
    "image" TEXT,
    "org" TEXT,
    "subOrg" TEXT,

    CONSTRAINT "HolodexChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Blacklist_channelId_guildId_key" ON "Blacklist"("channelId", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "HolodexChannel_id_key" ON "HolodexChannel"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_channelId_guildId_key" ON "Subscription"("channelId", "guildId");

-- AddForeignKey
ALTER TABLE "Blacklist" ADD CONSTRAINT "Blacklist_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "HolodexChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "HolodexChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
