ALTER TABLE "students" ADD COLUMN "pin_hash" text;
ALTER TABLE "students" ADD COLUMN "pin_reset_required" boolean DEFAULT true NOT NULL;
