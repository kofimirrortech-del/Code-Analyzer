import { Router, type IRouter, type Request, type Response } from "express";
import { db, storeItemsTable, productionBatchesTable, ordersTable } from "@workspace/db";
import { requireAuth } from "./auth.js";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function today() {
  return new Date().toISOString().split("T")[0];
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const date = (req.query.date as string) || today();

  const [storeItems, batches, recentOrders, allOrders] = await Promise.all([
    db.select().from(storeItemsTable).where(eq(storeItemsTable.date, date)),
    db.select().from(productionBatchesTable).where(eq(productionBatchesTable.date, date)),
    db.select().from(ordersTable).where(eq(ordersTable.date, date)).orderBy(desc(ordersTable.createdAt)).limit(5),
    db.select().from(ordersTable).where(eq(ordersTable.date, date)),
  ]);

  const totalInventory = storeItems.reduce((sum, i) => sum + parseFloat(i.quantity), 0);
  const totalProduced = batches.reduce((sum, b) => sum + parseFloat(b.quantityProduced), 0);
  const totalOrders = allOrders.length;
  const totalRevenue = allOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);
  const lowStockItems = storeItems
    .filter(i => parseFloat(i.quantity) < 10)
    .map(i => ({ name: i.itemName, quantity: parseFloat(i.quantity) }));

  const formattedOrders = recentOrders.map(o => ({
    id: o.id,
    client: o.client,
    status: o.status,
    deliveryDate: o.deliveryDate,
    total: parseFloat(o.total),
    createdAt: o.createdAt.toISOString(),
  }));

  res.json({ totalInventory, totalProduced, totalOrders, totalRevenue, lowStockItems, recentOrders: formattedOrders });
});

export default router;
