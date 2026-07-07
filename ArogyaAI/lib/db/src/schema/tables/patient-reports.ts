import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { alertRiskEnum } from "./alerts";

export const patientReportsTable = pgTable("patient_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  locality: text("locality").notNull(),
  symptoms: text("symptoms").notNull(),
  risk: alertRiskEnum("risk").notNull().default("yellow"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPatientReportSchema = createInsertSchema(patientReportsTable).omit({ id: true, createdAt: true });
export type InsertPatientReport = z.infer<typeof insertPatientReportSchema>;
export type PatientReport = typeof patientReportsTable.$inferSelect;
