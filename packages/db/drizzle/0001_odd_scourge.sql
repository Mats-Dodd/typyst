CREATE INDEX "entry_updated_at_idx" ON "entry" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "entry_name_idx" ON "entry" USING btree ("name");--> statement-breakpoint
CREATE INDEX "entry_user_updated_idx" ON "entry" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "entry_collection_updated_idx" ON "entry" USING btree ("collection_id","updated_at");