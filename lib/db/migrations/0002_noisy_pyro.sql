DO $$ BEGIN
 CREATE TYPE "public"."document_status" AS ENUM('uploaded', 'processing', 'processed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"content" text NOT NULL,
	"status" "document_status" DEFAULT 'uploaded' NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	CONSTRAINT "documents_filename_unique" UNIQUE("filename")
);
--> statement-breakpoint
-- Hand-edited: old starter chunks have no document; drop them so the NOT NULL columns below can be added.
DELETE FROM "embeddings";--> statement-breakpoint
DROP TABLE "resources";--> statement-breakpoint
ALTER TABLE "embeddings" ADD COLUMN "document_id" varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE "embeddings" ADD COLUMN "chunk_index" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "embeddings" ADD COLUMN "recipe_name" text;--> statement-breakpoint
ALTER TABLE "embeddings" ADD COLUMN "section_type" varchar(50);--> statement-breakpoint
ALTER TABLE "embeddings" ADD COLUMN "category" varchar(50);--> statement-breakpoint
ALTER TABLE "embeddings" ADD COLUMN "difficulty" varchar(20);--> statement-breakpoint
ALTER TABLE "embeddings" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embeddings_embedding_hnsw_idx" ON "embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embeddings_document_id_idx" ON "embeddings" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embeddings_section_type_idx" ON "embeddings" USING btree ("section_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embeddings_category_idx" ON "embeddings" USING btree ("category");--> statement-breakpoint
ALTER TABLE "embeddings" DROP COLUMN IF EXISTS "resource_id";