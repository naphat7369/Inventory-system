-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "departmentId" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "email" TEXT,
    "position" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isApprover" BOOLEAN NOT NULL DEFAULT false,
    "isAllBranches" BOOLEAN NOT NULL DEFAULT false,
    "branchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("branchId", "createdAt", "departmentId", "email", "fullName", "id", "isActive", "isApprover", "passwordHash", "phone", "position", "role", "updatedAt", "username") SELECT "branchId", "createdAt", "departmentId", "email", "fullName", "id", "isActive", "isApprover", "passwordHash", "phone", "position", "role", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_branchId_isActive_isApprover_idx" ON "User"("branchId", "isActive", "isApprover");
CREATE INDEX "User_isAllBranches_isActive_isApprover_idx" ON "User"("isAllBranches", "isActive", "isApprover");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
