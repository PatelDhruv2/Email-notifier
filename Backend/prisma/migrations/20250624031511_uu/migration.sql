/*
  Warnings:

  - A unique constraint covering the columns `[messageId]` on the table `Email` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `priority` on the `Email` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `matchType` on the `PriorityRule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `priority` on the `PriorityRule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('sender', 'keyword');

-- AlterTable
ALTER TABLE "Email" DROP COLUMN "priority",
ADD COLUMN     "priority" "PriorityLevel" NOT NULL;

-- AlterTable
ALTER TABLE "PriorityRule" DROP COLUMN "matchType",
ADD COLUMN     "matchType" "MatchType" NOT NULL,
DROP COLUMN "priority",
ADD COLUMN     "priority" "PriorityLevel" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Email_messageId_key" ON "Email"("messageId");
