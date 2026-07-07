import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const alertRiskEnum = pgEnum("alert_risk", ["yellow", "orange", "red"]);

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  locality: text("locality").notNull(),
  rule: text("rule").notNull(),
  detail: text("detail").notNull(),
  transcript: text("transcript"),
  field: text("field"),
  risk: alertRiskEnum("risk").notNull().default("yellow"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
