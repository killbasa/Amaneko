-- CreateTable
CREATE TABLE "FeedbackBlacklist" (
    "userId" TEXT NOT NULL,

    CONSTRAINT "FeedbackBlacklist_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackBlacklist_userId_key" ON "FeedbackBlacklist"("userId");
