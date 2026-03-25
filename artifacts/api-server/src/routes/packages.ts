import { Router, type IRouter, type Request, type Response } from "express";
import { db, packagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const bodySchema = z.object({
  packageType: z.string().min(1),
  stock: z.coerce.number(),
  expiryDate: z.string().min(1),
});

function today() {
  return new Date().toISOString().split("T")[0];
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const date = (req.query.date as string) || today();
  const items = await db.select().from(packagesTable)
    .where(eq(packagesTable.date, date))
    .orderBy(packagesTable.createdAt);
  res.json(items.map(i => ({
    id: i.id,
    packageType: i.packageType,
    stock: parseFloat(i.stock),
    expiryDate: i.expiryDate,
    date: i.date,
    createdAt: i.createdAt.toISOString(),
  })));
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [item] = await db.insert(packagesTable).values({
    packageType: parsed.data.packageType,
    stock: String(parsed.data.stock),
    expiryDate: parsed.data.expiryDate,
    date: today(),
  }).returning();
  res.status(201).json({ id: item.id, packageType: item.packageType, stock: parseFloat(item.stock), expiryDate: item.expiryDate, date: item.date, createdAt: item.createdAt.toISOString() });
});

router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [item] = await db.update(packagesTable).set({
    packageType: parsed.data.packageType,
    stock: String(parsed.data.stock),
    expiryDate: parsed.data.expiryDate,
  }).where(eq(packagesTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: item.id, packageType: item.packageType, stock: parseFloat(item.stock), expiryDate: item.expiryDate, date: item.date, createdAt: item.createdAt.toISOString() });
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.delete(packagesTable).where(eq(packagesTable.id, id));
  res.json({ success: true });
});

export default router;
