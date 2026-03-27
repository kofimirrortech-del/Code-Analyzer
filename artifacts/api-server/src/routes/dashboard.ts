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

  const [storeItems, batches, allOrders] = await Promise.all([
    db.select().from(storeItemsTable),
    db.select().from(productionBatchesTable).where(eq(productionBatchesTable.date, date)).orderBy(desc(productionBatchesTable.createdAt)),
    db.select().from(ordersTable).where(eq(ordersTable.date, date)),
  ]);

  const totalInventory = storeItems.reduce((sum, i) => sum + parseFloat(i.quantity ?? "0"), 0);
  const totalProduced = batches.reduce((sum, b) => sum + parseFloat(b.quantityProduced ?? "0"), 0);
  const totalOrders = allOrders.length;
  const totalRevenue = allOrders.reduce((sum, o) => sum + parseFloat(o.total ?? "0"), 0);

  const lowStockItems = storeItems
    .filter(i => {
      const threshold = parseFloat(i.lowStockThreshold ?? "0");
      if (threshold <= 0) return false;
      const total = parseFloat(i.quantity ?? "0") + parseFloat(i.addedStock ?? "0");
      return total < threshold;
    })
    .map(i => ({
      name: i.itemName,
      quantity: parseFloat(i.quantity ?? "0") + parseFloat(i.addedStock ?? "0"),
      threshold: parseFloat(i.lowStockThreshold ?? "0"),
    }));

  const todayProduction = batches.map(b => ({
    id: b.id,
    product: b.product,
    quantityProduced: parseFloat(b.quantityProduced ?? "0"),
    unit: b.unit ?? "units",
    baker: b.baker,
    note: b.note ?? "",
    date: b.date,
  }));

  res.json({ totalInventory, totalProduced, totalOrders, totalRevenue, lowStockItems, todayProduction });
});

export default router;
