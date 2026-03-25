import { Router, type IRouter, type Request, type Response } from "express";
import { db, ordersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const bodySchema = z.object({
  client: z.string().min(1),
  status: z.enum(["Pending", "Processing", "Dispatched", "Delivered", "Cancelled"]),
  deliveryDate: z.string().min(1),
  total: z.coerce.number(),
});

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatOrder(o: typeof ordersTable.$inferSelect) {
  return {
    id: o.id,
    client: o.client,
    status: o.status,
    deliveryDate: o.deliveryDate,
    total: parseFloat(o.total),
    date: o.date,
    createdAt: o.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const date = (req.query.date as string) || today();
  const items = await db.select().from(ordersTable)
    .where(eq(ordersTable.date, date))
    .orderBy(desc(ordersTable.createdAt));
  res.json(items.map(formatOrder));
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [item] = await db.insert(ordersTable).values({
    client: parsed.data.client,
    status: parsed.data.status,
    deliveryDate: parsed.data.deliveryDate,
    total: String(parsed.data.total),
    date: today(),
  }).returning();
  res.status(201).json(formatOrder(item));
});

router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [item] = await db.update(ordersTable).set({
    client: parsed.data.client,
    status: parsed.data.status,
    deliveryDate: parsed.data.deliveryDate,
    total: String(parsed.data.total),
  }).where(eq(ordersTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatOrder(item));
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.delete(ordersTable).where(eq(ordersTable.id, id));
  res.json({ success: true });
});

export default router;
