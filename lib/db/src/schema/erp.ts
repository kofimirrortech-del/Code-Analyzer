import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const storeItemsTable = pgTable("store_items", {
  id: serial("id").primaryKey(),
  itemName: text("item_name").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("0"),
  addedStock: numeric("added_stock", { precision: 10, scale: 2 }).notNull().default("0"),
  unit: text("unit").notNull().default("units"),
  supplier: text("supplier").notNull(),
  date: text("date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStoreItemSchema = createInsertSchema(storeItemsTable).omit({ id: true, createdAt: true });
export type InsertStoreItem = z.infer<typeof insertStoreItemSchema>;
export type StoreItem = typeof storeItemsTable.$inferSelect;

export const ingredientsTable = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  stock: numeric("stock", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  date: text("date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIngredientSchema = createInsertSchema(ingredientsTable).omit({ id: true, createdAt: true });
export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type Ingredient = typeof ingredientsTable.$inferSelect;

export const productionBatchesTable = pgTable("production_batches", {
  id: serial("id").primaryKey(),
  product: text("product").notNull(),
  quantityProduced: numeric("quantity_produced", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull().default("units"),
  baker: text("baker").notNull(),
  date: text("date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductionBatchSchema = createInsertSchema(productionBatchesTable).omit({ id: true, createdAt: true });
export type InsertProductionBatch = z.infer<typeof insertProductionBatchSchema>;
export type ProductionBatch = typeof productionBatchesTable.$inferSelect;

export const packagesTable = pgTable("packages", {
  id: serial("id").primaryKey(),
  packageType: text("package_type").notNull(),
  stock: numeric("stock", { precision: 10, scale: 2 }).notNull().default("0"),
  addedStock: numeric("added_stock", { precision: 10, scale: 2 }).notNull().default("0"),
  expiryDate: text("expiry_date").notNull(),
  date: text("date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPackageSchema = createInsertSchema(packagesTable).omit({ id: true, createdAt: true });
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packagesTable.$inferSelect;

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  notes: text("notes").default(""),
  item: text("item").notNull().default(""),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("0"),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  date: text("date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  username: text("username").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Session = typeof sessionsTable.$inferSelect;
