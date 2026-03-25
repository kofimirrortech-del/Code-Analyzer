import { Router, type IRouter, type Request, type Response } from "express";
import { db, storeItemsTable, ingredientsTable, productionBatchesTable, packagesTable, ordersTable } from "@workspace/db";
import { requireAuth } from "./auth.js";
import { eq, isNotNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dates", requireAuth, async (_req: Request, res: Response) => {
  const [store, ingredients, production, packages, orders] = await Promise.all([
    db.selectDistinct({ date: storeItemsTable.date }).from(storeItemsTable).where(isNotNull(storeItemsTable.date)),
    db.selectDistinct({ date: ingredientsTable.date }).from(ingredientsTable).where(isNotNull(ingredientsTable.date)),
    db.selectDistinct({ date: productionBatchesTable.date }).from(productionBatchesTable).where(isNotNull(productionBatchesTable.date)),
    db.selectDistinct({ date: packagesTable.date }).from(packagesTable).where(isNotNull(packagesTable.date)),
    db.selectDistinct({ date: ordersTable.date }).from(ordersTable).where(isNotNull(ordersTable.date)),
  ]);

  const allDates = new Set<string>();
  [...store, ...ingredients, ...production, ...packages, ...orders].forEach(r => {
    if (r.date) allDates.add(r.date);
  });

  const sorted = Array.from(allDates).sort((a, b) => b.localeCompare(a));
  res.json(sorted);
});

router.get("/summary", requireAuth, async (req: Request, res: Response) => {
  const date = req.query.date as string;
  if (!date) { res.status(400).json({ error: "date query param required" }); return; }

  const [storeItems, ingItems, prodItems, pkgItems, orderItems] = await Promise.all([
    db.select().from(storeItemsTable).where(eq(storeItemsTable.date, date)).orderBy(storeItemsTable.createdAt),
    db.select().from(ingredientsTable).where(eq(ingredientsTable.date, date)).orderBy(ingredientsTable.createdAt),
    db.select().from(productionBatchesTable).where(eq(productionBatchesTable.date, date)).orderBy(productionBatchesTable.createdAt),
    db.select().from(packagesTable).where(eq(packagesTable.date, date)).orderBy(packagesTable.createdAt),
    db.select().from(ordersTable).where(eq(ordersTable.date, date)).orderBy(ordersTable.createdAt),
  ]);

  res.json({
    date,
    store: storeItems.map(i => ({ id: i.id, itemName: i.itemName, quantity: parseFloat(i.quantity), supplier: i.supplier, createdAt: i.createdAt.toISOString() })),
    ingredients: ingItems.map(i => ({ id: i.id, name: i.name, stock: parseFloat(i.stock), unit: i.unit, createdAt: i.createdAt.toISOString() })),
    production: prodItems.map(i => ({ id: i.id, product: i.product, quantityProduced: parseFloat(i.quantityProduced), baker: i.baker, createdAt: i.createdAt.toISOString() })),
    packages: pkgItems.map(i => ({ id: i.id, packageType: i.packageType, stock: parseFloat(i.stock), expiryDate: i.expiryDate, createdAt: i.createdAt.toISOString() })),
    orders: orderItems.map(o => ({ id: o.id, client: o.client, status: o.status, deliveryDate: o.deliveryDate, total: parseFloat(o.total), createdAt: o.createdAt.toISOString() })),
    stats: {
      totalInventory: storeItems.reduce((s, i) => s + parseFloat(i.quantity), 0),
      totalProduced: prodItems.reduce((s, i) => s + parseFloat(i.quantityProduced), 0),
      totalOrders: orderItems.length,
      totalRevenue: orderItems.reduce((s, o) => s + parseFloat(o.total), 0),
    },
  });
});

export default router;
