import { Router, type IRouter, type Request, type Response } from "express";
import { db, storeItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const bodySchema = z.object({
  itemName: z.string().min(1),
  quantity: z.coerce.number().default(0),
  addedStock: z.coerce.number().default(0),
  unit: z.string().min(1).default("units"),
  supplier: z.string().min(1),
});

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatItem(i: typeof storeItemsTable.$inferSelect) {
  const qty = parseFloat(i.quantity ?? "0");
  const added = parseFloat(i.addedStock ?? "0");
  return {
    id: i.id,
    itemName: i.itemName,
    quantity: qty,
    addedStock: added,
    totalStock: qty + added,
    unit: i.unit ?? "units",
    supplier: i.supplier,
    date: i.date,
    createdAt: i.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const items = await db.select().from(storeItemsTable).orderBy(storeItemsTable.createdAt);
  res.json(items.map(formatItem));
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;
  const [item] = await db.insert(storeItemsTable).values({
    itemName: d.itemName,
    quantity: String(d.quantity),
    addedStock: String(d.addedStock),
    unit: d.unit,
    supplier: d.supplier,
    date: today(),
  }).returning();
  res.status(201).json(formatItem(item));
});

router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;
  const [item] = await db.update(storeItemsTable).set({
    itemName: d.itemName,
    quantity: String(d.quantity),
    addedStock: String(d.addedStock),
    unit: d.unit,
    supplier: d.supplier,
  }).where(eq(storeItemsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatItem(item));
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.delete(storeItemsTable).where(eq(storeItemsTable.id, id));
  res.json({ success: true });
});

export default router;
