// Proposed only: keep these tables separate from lib/db/schema.ts until reviewed.
import {
  boolean,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const scoreTerm = pgEnum("score_term", ["first", "second", "third"]);

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teacherAssignments = pgTable(
  "teacher_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherUserId: text("teacher_user_id").notNull(),
    classId: uuid("class_id").notNull(),
    subjectId: uuid("subject_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("teacher_assignments_unique_idx").on(
      table.teacherUserId,
      table.classId,
      table.subjectId,
    ),
    index("teacher_assignments_class_id_idx").on(table.classId),
  ],
);

export const scores = pgTable(
  "scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").notNull(),
    subjectId: uuid("subject_id").notNull(),
    classId: uuid("class_id").notNull(),
    term: scoreTerm("term").notNull(),
    caScore: numeric("ca_score", { precision: 5, scale: 2 }).notNull(),
    examScore: numeric("exam_score", { precision: 5, scale: 2 }).notNull(),
    total: numeric("total", { precision: 5, scale: 2 }).notNull(),
    grade: text("grade").notNull(),
    enteredBy: text("entered_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("scores_student_subject_term_idx").on(
      table.studentId,
      table.subjectId,
      table.term,
    ),
    index("scores_class_term_idx").on(table.classId, table.term),
  ],
);

export const resultsPublished = pgTable(
  "results_published",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id").notNull(),
    term: scoreTerm("term").notNull(),
    published: boolean("published").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("results_published_class_term_idx").on(
      table.classId,
      table.term,
    ),
  ],
);
