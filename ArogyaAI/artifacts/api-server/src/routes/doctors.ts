import { Router, Request, Response } from "express";
import { db, doctorsTable } from "@workspace/db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const doctors = await db.select().from(doctorsTable);
  res.json({ doctors });
});

export default router;
