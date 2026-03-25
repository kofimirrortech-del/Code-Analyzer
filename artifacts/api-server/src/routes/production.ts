import { Router, type IRouter, type Request, type Response } from "express";
import { db, productionBatchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const bodySchema = z.object({
  product: z.string().min(1),
  quantityProduced: z.coerce.number(),
  baker: z.string().min(1),
});

function today() {
  return new Date().toISOString().split("T")[0];
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const date = (req.query.date as string) || today();
  const items = await db.select().from(productionBatchesTable)
    .where(eq(productionBatchesTable.date, date))
    .orderBy(productionBatchesTable.createdAt);
  res.json(items.map(i => ({
    id: i.id,
    product: i.product,
    quantityProduced: parseFloat(i.quantityProduced),
    baker: i.baker,
    date: i.date,
    createdAt: i.createdAt.toISOString(),
  })));
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [item] = await db.insert(productionBatchesTable).values({
    product: parsed.data.product,
    quantityProduced: String(parsed.data.quantityProduced),
    baker: parsed.data.baker,
    date: today(),
  }).returning();
  res.status(201).json({ id: item.id, product: item.product, quantityProduced: parseFloat(item.quantityProduced), baker: item.baker, date: item.date, createdAt: item.createdAt.toISOString() });
});

router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [item] = await db.update(productionBatchesTable).set({
    product: parsed.data.product,
    quantityProduced: String(parsed.data.quantityProduced),
    baker: parsed.data.baker,
  }).where(eq(productionBatchesTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: item.id, product: item.product, quantityProduced: parseFloat(item.quantityProduced), baker: item.baker, date: item.date, createdAt: item.createdAt.toISOString() });
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.delete(productionBatchesTable).where(eq(productionBatchesTable.id, id));
  res.json({ success: true });
});

export default router;
