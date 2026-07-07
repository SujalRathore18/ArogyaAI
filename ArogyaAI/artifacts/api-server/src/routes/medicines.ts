import { Router, Request, Response } from "express";
import { db, medicinesTable } from "@workspace/db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const medicines = await db.select().from(medicinesTable);
  res.json({ medicines });
});

export default router;
