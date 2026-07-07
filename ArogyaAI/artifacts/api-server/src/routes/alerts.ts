import { Router, Request, Response } from "express";
import { desc } from "drizzle-orm";
import { db, alertsTable, insertAlertSchema } from "@workspace/db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const alerts = await db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt)).limit(50);
  res.json({ alerts });
});

router.post("/", async (req: Request, res: Response) => {
  const parsed = insertAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input.", details: parsed.error.flatten() });
  }
  const [alert] = await db.insert(alertsTable).values(parsed.data).returning();
  res.status(201).json({ alert });
});

export default router;
