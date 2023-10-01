/*
  Warnings:

  - The primary key for the `StreamComment` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "StreamComment" DROP CONSTRAINT "StreamComment_pkey",
ADD CONSTRAINT "StreamComment_pkey" PRIMARY KEY ("id");
