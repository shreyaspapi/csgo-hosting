-- CreateTable
CREATE TABLE "MapVote" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "map" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapVote_matchId_map_idx" ON "MapVote"("matchId", "map");

-- CreateIndex
CREATE INDEX "MapVote_userId_idx" ON "MapVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MapVote_matchId_userId_key" ON "MapVote"("matchId", "userId");

-- AddForeignKey
ALTER TABLE "MapVote" ADD CONSTRAINT "MapVote_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapVote" ADD CONSTRAINT "MapVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
