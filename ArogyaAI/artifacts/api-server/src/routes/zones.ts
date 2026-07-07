import { Router, Request, Response } from "express";
import { db, zonesTable } from "@workspace/db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const zones = await db.select().from(zonesTable);
  res.json({ zones });
});

export default router;
