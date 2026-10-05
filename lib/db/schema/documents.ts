import { sql } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { nanoid } from "@/lib/utils";

export const documentStatus = pgEnum("document_status", [
  "uploaded",
  "processing",
  "processed",
  "failed",
]);

// Uploaded source files. The raw content is kept so /api/process can be re-run.
export const documents = pgTable("documents", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  filename: varchar("filename", { length: 255 }).notNull().unique(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  content: text("content").notNull(),
  status: documentStatus("status").notNull().default("uploaded"),
  chunkCount: integer("chunk_count").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
  processedAt: timestamp("processed_at"),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
