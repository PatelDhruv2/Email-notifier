/*
  Warnings:

  - You are about to drop the column `messageId` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `senderEmail` on the `Email` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Email" DROP COLUMN "messageId",
DROP COLUMN "senderEmail";
