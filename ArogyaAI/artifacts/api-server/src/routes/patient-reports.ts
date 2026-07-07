import { Router, Request, Response } from "express";
import { desc } from "drizzle-orm";
import { db, patientReportsTable, insertPatientReportSchema } from "@workspace/db";
import { requireAuth, requireRole, optionalAuth } from "../middleware/auth";

const router = Router();

// Patients (or guests) can submit a report.
router.post("/", optionalAuth, async (req: Request, res: Response) => {
  const parsed = insertPatientReportSchema.safeParse({
    ...req.body,
    userId: req.user?.userId ?? null,
  });
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input.", details: parsed.error.flatten() });
  }
  const [report] = await db.insert(patientReportsTable).values(parsed.data).returning();
  res.status(201).json({ report });
});

// Only management staff can view the full report list.
router.get("/", requireAuth, requireRole("mgmt"), async (_req: Request, res: Response) => {
  const reports = await db
    .select()
    .from(patientReportsTable)
    .orderBy(desc(patientReportsTable.createdAt))
    .limit(100);
  res.json({ reports });
});

export default router;
