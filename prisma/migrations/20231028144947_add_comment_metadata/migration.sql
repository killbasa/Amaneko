/*
  Warnings:

  - Added the required column `messageId` to the `StreamComment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StreamComment" ADD COLUMN     "channelId" TEXT,
ADD COLUMN     "messageId" TEXT NOT NULL;
