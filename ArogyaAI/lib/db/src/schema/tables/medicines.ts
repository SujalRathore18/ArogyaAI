import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const medicinesTable = pgTable("medicines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  stock: integer("stock").notNull().default(0),
  burnRate: integer("burn_rate").notNull().default(1),
  phc: text("phc").notNull(),
});

export const insertMedicineSchema = createInsertSchema(medicinesTable).omit({ id: true });
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type Medicine = typeof medicinesTable.$inferSelect;
