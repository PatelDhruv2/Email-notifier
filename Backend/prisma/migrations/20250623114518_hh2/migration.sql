-- CreateTable
CREATE TABLE "PriorityRule" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "matchType" TEXT NOT NULL,
    "priority" TEXT NOT NULL,

    CONSTRAINT "PriorityRule_pkey" PRIMARY KEY ("id")
);
