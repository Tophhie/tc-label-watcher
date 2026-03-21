CREATE TABLE `new_accounts` (
	`did` text PRIMARY KEY NOT NULL,
	`pds_host` text NOT NULL,
	`date_found` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `new_accounts_did_unique` ON `new_accounts` (`did`);