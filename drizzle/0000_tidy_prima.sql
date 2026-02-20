CREATE TABLE `labels_applied` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`did` text NOT NULL,
	`label` text NOT NULL,
	`action` text NOT NULL,
	`date_applied` integer NOT NULL,
	FOREIGN KEY (`did`) REFERENCES `watched_repos`(`did`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `watched_repos` (
	`did` text PRIMARY KEY NOT NULL,
	`pds_host` text NOT NULL,
	`active` integer NOT NULL,
	`date_first_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watched_repos_did_unique` ON `watched_repos` (`did`);