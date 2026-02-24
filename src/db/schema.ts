import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const watchedRepos = sqliteTable("watched_repos", {
  did: text("did").primaryKey().unique(),
  pdsHost: text("pds_host").notNull(),
  active: integer("active", { mode: "boolean" }).notNull(),
  dateFirstSeen: integer("date_first_seen", { mode: "timestamp" }).notNull(),
  //If set means a take down was issued
  takeDownIssuedDate: integer("take_down_issued_date", {
    mode: "timestamp",
  }),
});

export const labelsApplied = sqliteTable("labels_applied", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  did: text("did")
    .notNull()
    .references(() => watchedRepos.did),
  label: text("label").notNull(),
  labeler: text("labeler").notNull(),
  action: text("action").notNull(),
  negated: integer("negated", { mode: "boolean" }).default(false).notNull(),
  dateApplied: integer("date_applied", { mode: "timestamp" }).notNull(),
  // * AT URI of the record, repository (account), or other resource that this label applies to.
  uri: text("uri"),
});

export const labelerCursor = sqliteTable("labeler_cursors", {
  labelerId: text("labeler_id").unique(),
  cursor: integer("cursor").notNull(),
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
