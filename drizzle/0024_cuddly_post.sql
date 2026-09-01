ALTER TABLE `apps` ADD `feltdb_runtime` text DEFAULT 'server';--> statement-breakpoint
ALTER TABLE `apps` ADD `feltdb_mode` text DEFAULT 'local';--> statement-breakpoint
ALTER TABLE `apps` ADD `feltdb_project_id` text;--> statement-breakpoint
ALTER TABLE `apps` ADD `feltdb_account_id` text;--> statement-breakpoint
ALTER TABLE `apps` ADD `feltdb_status` text;