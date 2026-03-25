import { Router, type IRouter, type Request, type Response } from "express";
import { db, packagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const bodySchema = z.object({
  packageType: z.string().min(1),
  stock: z.coerce.number().default(0),
  addedStock: z.coerce.number().default(0),
  expiryDate: z.string().min(1),
});

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatPackage(p: typeof packagesTable.$inferSelect) {
  const stock = parseFloat(p.stock ?? "0");
  const added = parseFloat(p.addedStock ?? "0");
  return {
    id: p.id,
    packageType: p.packageType,
    stock,
    addedStock: added,
    totalStock: stock + added,
    expiryDate: p.expiryDate,
    date: p.date,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const items = await db.select().from(packagesTable).orderBy(desc(packagesTable.createdAt));
  res.json(items.map(formatPackage));
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;
  const [item] = await db.insert(packagesTable).values({
    packageType: d.packageType,
    stock: String(d.stock),
    addedStock: String(d.addedStock),
    expiryDate: d.expiryDate,
    date: today(),
  }).returning();
  res.status(201).json(formatPackage(item));
});

router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;
  const [item] = await db.update(packagesTable).set({
    packageType: d.packageType,
    stock: String(d.stock),
    addedStock: String(d.addedStock),
    expiryDate: d.expiryDate,
  }).where(eq(packagesTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatPackage(item));
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.delete(packagesTable).where(eq(packagesTable.id, id));
  res.json({ success: true });
});

export default router;
