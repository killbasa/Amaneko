-- CreateTable
CREATE TABLE "GuildBlacklist" (
    "guildId" TEXT NOT NULL,

    CONSTRAINT "GuildBlacklist_pkey" PRIMARY KEY ("guildId")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildBlacklist_guildId_key" ON "GuildBlacklist"("guildId");
