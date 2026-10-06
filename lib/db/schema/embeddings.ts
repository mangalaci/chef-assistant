import {
  customType,
  index,
  integer,
  pgTable,
  text,
  varchar,
  vector,
} from "drizzle-orm/pg-core";

import { nanoid } from "@/lib/utils";
import { documents } from "./documents";

// drizzle-orm 0.31's jsonb() stringifies the value, and postgres.js stringifies
// jsonb parameters again, so the column ends up holding a JSON *string*. This
// type hands the object to postgres.js as is, which serializes it once.
type Json = Record<string, unknown>;
const jsonb = customType<{ data: Json; driverData: Json }>({
  dataType: () => "jsonb",
  toDriver: (value) => value,
});

// One row per chunk. Columns we filter on are real columns; everything else
// goes into `metadata`.
export const embeddings = pgTable(
  "embeddings",
  {
    id: varchar("id", { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    documentId: varchar("document_id", { length: 191 })
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    recipeName: text("recipe_name"),
    sectionType: varchar("section_type", { length: 50 }),
    category: varchar("category", { length: 50 }),
    difficulty: varchar("difficulty", { length: 20 }),
    metadata: jsonb("metadata"),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  },
  (table) => ({
    embeddingIndex: index("embeddings_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    documentIdIndex: index("embeddings_document_id_idx").on(table.documentId),
    sectionTypeIndex: index("embeddings_section_type_idx").on(
      table.sectionType,
    ),
    categoryIndex: index("embeddings_category_idx").on(table.category),
  }),
);

export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
