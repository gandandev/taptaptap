CREATE INDEX "emotion_entries_entry_date_student_idx" ON "emotion_entries" USING btree ("entry_date","student_id");--> statement-breakpoint
CREATE INDEX "students_active_name_idx" ON "students" USING btree ("is_active","name");
