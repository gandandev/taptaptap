CREATE TABLE "teacher_dashboard_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"summary_date" date NOT NULL,
	"signature" text NOT NULL,
	"bullets_json" jsonb NOT NULL,
	"needed_competency_id" text NOT NULL,
	"needed_competency_label" text NOT NULL,
	"source" text DEFAULT 'local' NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
