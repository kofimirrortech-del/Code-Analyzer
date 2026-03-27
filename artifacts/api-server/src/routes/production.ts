import { Router, type IRouter, type Request, type Response } from "express";
import { db, productionBatchesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const bodySchema = z.object({
  product: z.string().min(1),
  quantityProduced: z.coerce.number().min(0),
  unit: z.string().min(1).default("units"),
  baker: z.string().min(1),
  note: z.string().default(""),
});

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatBatch(b: typeof productionBatchesTable.$inferSelect) {
  return {
    id: b.id,
    product: b.product,
    quantityProduced: parseFloat(b.quantityProduced ?? "0"),
    unit: b.unit ?? "units",
    baker: b.baker,
    note: b.note ?? "",
    date: b.date,
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const items = await db.select().from(productionBatchesTable).orderBy(desc(productionBatchesTable.createdAt));
  res.json(items.map(formatBatch));
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;
  const [item] = await db.insert(productionBatchesTable).values({
    product: d.product,
    quantityProduced: String(d.quantityProduced),
    unit: d.unit,
    baker: d.baker,
    note: d.note,
    date: today(),
  }).returning();
  res.status(201).json(formatBatch(item));
});

router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;
  const [item] = await db.update(productionBatchesTable).set({
    product: d.product,
    quantityProduced: String(d.quantityProduced),
    unit: d.unit,
    baker: d.baker,
    note: d.note,
  }).where(eq(productionBatchesTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatBatch(item));
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.delete(productionBatchesTable).where(eq(productionBatchesTable.id, id));
  res.json({ success: true });
});

export default router;
