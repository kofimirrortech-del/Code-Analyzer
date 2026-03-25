import { Router, type IRouter, type Request, type Response } from "express";
import { db, ingredientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const bodySchema = z.object({
  name: z.string().min(1),
  stock: z.coerce.number(),
  unit: z.string().min(1),
});

function today() {
  return new Date().toISOString().split("T")[0];
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const date = (req.query.date as string) || today();
  const items = await db.select().from(ingredientsTable)
    .where(eq(ingredientsTable.date, date))
    .orderBy(ingredientsTable.createdAt);
  res.json(items.map(i => ({
    id: i.id,
    name: i.name,
    stock: parseFloat(i.stock),
    unit: i.unit,
    date: i.date,
    createdAt: i.createdAt.toISOString(),
  })));
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [item] = await db.insert(ingredientsTable).values({
    name: parsed.data.name,
    stock: String(parsed.data.stock),
    unit: parsed.data.unit,
    date: today(),
  }).returning();
  res.status(201).json({ id: item.id, name: item.name, stock: parseFloat(item.stock), unit: item.unit, date: item.date, createdAt: item.createdAt.toISOString() });
});

router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [item] = await db.update(ingredientsTable).set({
    name: parsed.data.name,
    stock: String(parsed.data.stock),
    unit: parsed.data.unit,
  }).where(eq(ingredientsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: item.id, name: item.name, stock: parseFloat(item.stock), unit: item.unit, date: item.date, createdAt: item.createdAt.toISOString() });
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.delete(ingredientsTable).where(eq(ingredientsTable.id, id));
  res.json({ success: true });
});

export default router;
