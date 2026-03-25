import { Router, type IRouter, type Request, type Response } from "express";
import { db, ordersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const bodySchema = z.object({
  notes: z.string().default(""),
  item: z.string().min(1),
  quantity: z.coerce.number().min(0),
  unitCost: z.coerce.number().min(0),
});

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatOrder(o: typeof ordersTable.$inferSelect) {
  const qty = parseFloat(o.quantity ?? "0");
  const unitCost = parseFloat(o.unitCost ?? "0");
  return {
    id: o.id,
    notes: o.notes ?? "",
    item: o.item ?? "",
    quantity: qty,
    unitCost,
    total: qty * unitCost,
    date: o.date,
    createdAt: o.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const items = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  res.json(items.map(formatOrder));
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;
  const total = d.quantity * d.unitCost;
  const [order] = await db.insert(ordersTable).values({
    notes: d.notes,
    item: d.item,
    quantity: String(d.quantity),
    unitCost: String(d.unitCost),
    total: String(total),
    date: today(),
  }).returning();
  res.status(201).json(formatOrder(order));
});

router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;
  const total = d.quantity * d.unitCost;
  const [order] = await db.update(ordersTable).set({
    notes: d.notes,
    item: d.item,
    quantity: String(d.quantity),
    unitCost: String(d.unitCost),
    total: String(total),
  }).where(eq(ordersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatOrder(order));
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.delete(ordersTable).where(eq(ordersTable.id, id));
  res.json({ success: true });
});

export default router;
