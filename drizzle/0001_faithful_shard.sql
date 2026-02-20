CREATE TABLE `labeler_cursors` (
	`labeler_id` text,
	`cursor` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `labeler_cursors_labeler_id_unique` ON `labeler_cursors` (`labeler_id`);