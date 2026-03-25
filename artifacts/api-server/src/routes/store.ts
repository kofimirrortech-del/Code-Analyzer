import { Router, type IRouter, type Request, type Response } from "express";
import { db, storeItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const bodySchema = z.object({
  itemName: z.string().min(1),
  quantity: z.coerce.number(),
  supplier: z.string().min(1),
});

function today() {
  return new Date().toISOString().split("T")[0];
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const date = (req.query.date as string) || today();
  const items = await db.select().from(storeItemsTable)
    .where(eq(storeItemsTable.date, date))
    .orderBy(storeItemsTable.createdAt);
  res.json(items.map(i => ({
    id: i.id,
    itemName: i.itemName,
    quantity: parseFloat(i.quantity),
    supplier: i.supplier,
    date: i.date,
    createdAt: i.createdAt.toISOString(),
  })));
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [item] = await db.insert(storeItemsTable).values({
    itemName: parsed.data.itemName,
    quantity: String(parsed.data.quantity),
    supplier: parsed.data.supplier,
    date: today(),
  }).returning();
  res.status(201).json({ id: item.id, itemName: item.itemName, quantity: parseFloat(item.quantity), supplier: item.supplier, date: item.date, createdAt: item.createdAt.toISOString() });
});

router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [item] = await db.update(storeItemsTable).set({
    itemName: parsed.data.itemName,
    quantity: String(parsed.data.quantity),
    supplier: parsed.data.supplier,
  }).where(eq(storeItemsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: item.id, itemName: item.itemName, quantity: parseFloat(item.quantity), supplier: item.supplier, date: item.date, createdAt: item.createdAt.toISOString() });
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.delete(storeItemsTable).where(eq(storeItemsTable.id, id));
  res.json({ success: true });
});

export default router;
