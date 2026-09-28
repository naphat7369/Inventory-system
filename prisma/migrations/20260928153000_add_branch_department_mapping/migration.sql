CREATE TABLE "BranchDepartment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "hodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BranchDepartment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BranchDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BranchDepartment_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "BranchDepartment" ("id", "branchId", "departmentId", "hodId", "isActive", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), branch."id", department."id",
       CASE WHEN department."branchId" = branch."id" THEN department."hodId" ELSE NULL END,
       true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Branch" AS branch
CROSS JOIN "Department" AS department
WHERE branch."isActive" = true AND department."isActive" = true;

CREATE UNIQUE INDEX "BranchDepartment_branchId_departmentId_key" ON "BranchDepartment"("branchId", "departmentId");
CREATE INDEX "BranchDepartment_departmentId_isActive_idx" ON "BranchDepartment"("departmentId", "isActive");
CREATE INDEX "BranchDepartment_hodId_idx" ON "BranchDepartment"("hodId");
