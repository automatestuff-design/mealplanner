-- ActivityConnection: stores Terra user ID per app user
CREATE TABLE "ActivityConnection" (
  "id"          TEXT NOT NULL,
  "terraUserId" TEXT NOT NULL,
  "provider"    TEXT NOT NULL DEFAULT 'GARMIN',
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId"      TEXT NOT NULL,
  CONSTRAINT "ActivityConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ActivityConnection_terraUserId_key" ON "ActivityConnection"("terraUserId");
CREATE UNIQUE INDEX "ActivityConnection_userId_key"      ON "ActivityConnection"("userId");
ALTER TABLE "ActivityConnection"
  ADD CONSTRAINT "ActivityConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DailyActivity: one row per user per calendar date
CREATE TABLE "DailyActivity" (
  "id"               TEXT NOT NULL,
  "date"             DATE NOT NULL,
  "steps"            INTEGER,
  "activeKcal"       INTEGER,
  "bmrKcal"          INTEGER,
  "totalKcal"        INTEGER,
  "heartRateAvg"     INTEGER,
  "heartRateResting" INTEGER,
  "activeMinutes"    INTEGER,
  "stressAvg"        INTEGER,
  "source"           TEXT NOT NULL DEFAULT 'GARMIN',
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId"           TEXT NOT NULL,
  CONSTRAINT "DailyActivity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DailyActivity_userId_date_key" ON "DailyActivity"("userId", "date");
CREATE INDEX "DailyActivity_userId_idx"             ON "DailyActivity"("userId");
ALTER TABLE "DailyActivity"
  ADD CONSTRAINT "DailyActivity_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
