import { pgTable, serial, text, real, integer, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const hospitalsTable = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  specialties: text("specialties").array().notNull().default([]),
  icu: boolean("icu").notNull().default(false),
  trauma: boolean("trauma").notNull().default(false),
  cardiac: boolean("cardiac").notNull().default(false),
  beds: integer("beds").notNull().default(0),
  reviews: real("reviews").notNull().default(0),
  icuPct: integer("icu_pct").notNull().default(0),
  bedPct: integer("bed_pct").notNull().default(0),
});

export const insertHospitalSchema = createInsertSchema(hospitalsTable).omit({ id: true });
export type InsertHospital = z.infer<typeof insertHospitalSchema>;
export type Hospital = typeof hospitalsTable.$inferSelect;
