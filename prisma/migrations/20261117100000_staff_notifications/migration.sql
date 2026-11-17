CREATE TABLE "StaffNotificationState" (
    "userId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffNotificationState_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "StaffNotificationState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);