/*
  Warnings:

  - You are about to drop the `Video` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Video" DROP CONSTRAINT "Video_channelId_fkey";

-- DropTable
DROP TABLE "Video";

-- CreateTable
CREATE TABLE "StreamComment" (
    "id" BIGSERIAL NOT NULL,
    "videoId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "guildId" TEXT,

    CONSTRAINT "StreamComment_pkey" PRIMARY KEY ("videoId")
);

-- AddForeignKey
ALTER TABLE "StreamComment" ADD CONSTRAINT "StreamComment_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
