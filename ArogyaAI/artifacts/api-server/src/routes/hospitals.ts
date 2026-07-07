import { Router, Request, Response } from "express";
import { db, hospitalsTable } from "@workspace/db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const hospitals = await db.select().from(hospitalsTable);
  res.json({ hospitals });
});

export default router;
