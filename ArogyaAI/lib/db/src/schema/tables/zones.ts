import { pgTable, serial, text, doublePrecision, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const riskLevelEnum = pgEnum("risk_level", ["red", "orange", "blue"]);

export const zonesTable = pgTable("zones", {
  id: serial("id").primaryKey(),
  locality: text("locality").notNull().unique(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  risk: riskLevelEnum("risk").notNull().default("blue"),
});

export const insertZoneSchema = createInsertSchema(zonesTable).omit({ id: true });
export type InsertZone = z.infer<typeof insertZoneSchema>;
export type Zone = typeof zonesTable.$inferSelect;
