DROP INDEX "labeler_cursors_labeler_id_unique";--> statement-breakpoint
DROP INDEX "watched_repos_did_unique";--> statement-breakpoint
ALTER TABLE `labeler_cursors` ALTER COLUMN "cursor" TO "cursor" integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `labeler_cursors_labeler_id_unique` ON `labeler_cursors` (`labeler_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `watched_repos_did_unique` ON `watched_repos` (`did`);