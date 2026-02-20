import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const watchedRepos = sqliteTable("watched_repos", {
  did: text("did").primaryKey().unique(),
  pdsHost: text("pds_host").notNull(),
  active: integer("active", { mode: "boolean" }).notNull(),
  dateFirstSeen: integer("date_first_seen", { mode: "timestamp" }).notNull(),
});

export const labelsApplied = sqliteTable("labels_applied", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  did: text("did")
    .notNull()
    .references(() => watchedRepos.did),
  label: text("label").notNull(),
  action: text("action").notNull(),
  dateApplied: integer("date_applied", { mode: "timestamp" }).notNull(),
});

export const labelerCursor = sqliteTable("labeler_cursors", {
  labelerId: text("labeler_id").unique(),
  cursor: text("cursor").notNull(),
});

export const watchedReposRelations = relations(watchedRepos, ({ many }) => ({
  labelsApplied: many(labelsApplied),
}));

export const labelsAppliedRelations = relations(labelsApplied, ({ one }) => ({
  watchedRepo: one(watchedRepos, {
    fields: [labelsApplied.did],
    references: [watchedRepos.did],
  }),
}));
