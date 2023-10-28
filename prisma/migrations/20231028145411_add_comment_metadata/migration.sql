/*
  Warnings:

  - A unique constraint covering the columns `[messageId]` on the table `StreamComment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `messageId` to the `StreamComment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StreamComment" ADD COLUMN     "channelId" TEXT,
ADD COLUMN     "messageId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "StreamComment_messageId_key" ON "StreamComment"("messageId");
