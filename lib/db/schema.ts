import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Better Auth owns the login/user tables. parent_students only stores the
// parent's Better Auth user id, so there is no foreign key to a users table.

// ---------------------------------------------------------------------------
// Feature 10: login, roles and security.
// These four tables are the standard Better Auth tables (user, session,
// account, verification). Added with the team's agreement for Feature 10.
// The extra `role` column on `user` decides what each signed-in person sees.
// ---------------------------------------------------------------------------
export const ROLES = ["parent", "teacher", "bursar", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** Which portal role this account has (Feature 10). */
  role: text("role").notNull().default("parent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------

export const invoiceStatus = pgEnum("invoice_status", [
  "unpaid",
  "partial",
  "paid",
  "overdue",
  "cancelled",
]);

export const paymentMethod = pgEnum("payment_method", [
  "cash",
  "bank_transfer",
  "card",
  "paystack",
  "other",
  "test",
]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
]);

export const attendanceStatus = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "excused",
]);

export type AttendanceStatus = (typeof attendanceStatus.enumValues)[number];

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    level: text("level"),
    academicYear: text("academic_year").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("classes_name_academic_year_idx").on(
      table.name,
      table.academicYear,
    ),
  ],
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    admissionNumber: text("admission_number").notNull().unique(),
    dateOfBirth: date("date_of_birth"),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("students_class_id_idx").on(table.classId)],
);

export const parentStudents = pgTable(
  "parent_students",
  {
    parentUserId: text("parent_user_id").notNull(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull().default("guardian"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.parentUserId, table.studentId] }),
    index("parent_students_parent_user_id_idx").on(table.parentUserId),
  ],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    attendanceDate: date("attendance_date").notNull(),
    status: attendanceStatus("status").notNull(),
    note: text("note"),
    // Better Auth owns the user table, so keep only its user ID here.
    markedBy: text("marked_by").notNull(),
    markedAt: timestamp("marked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("attendance_records_student_date_idx").on(
      table.studentId,
      table.attendanceDate,
    ),
    index("attendance_records_date_idx").on(table.attendanceDate),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull().unique(),
    status: invoiceStatus("status").notNull().default("unpaid"),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    notes: text("notes"),
    title: text("title"),
    session: text("session"),
    term: text("term"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("invoices_student_id_idx").on(table.studentId),
    index("invoices_status_idx").on(table.status),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitAmount: numeric("unit_amount", { precision: 12, scale: 2 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    category: text("category").default("Fees"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("invoice_items_invoice_id_idx").on(table.invoiceId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    method: paymentMethod("method").notNull().default("bank_transfer"),
    reference: text("reference"),
    receiptNumber: text("receipt_number").unique(),
    balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }),
    status: paymentStatus("status").notNull().default("success"),
    paidAt: timestamp("paid_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("payments_invoice_id_idx").on(table.invoiceId)],
);

export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type ParentStudent = typeof parentStudents.$inferSelect;
export type NewParentStudent = typeof parentStudents.$inferInsert;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecords.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

// Feature 10: auth types
export type AuthUser = typeof user.$inferSelect;
export type NewAuthUser = typeof user.$inferInsert;
export type AuthSession = typeof session.$inferSelect;
export type NewAuthSession = typeof session.$inferInsert;

// ---------------------------------------------------------------------------
// Feature 6 + 9: scores, subjects, teacher assignments and per-class results
// publication. Copied verbatim from
// origin/feature/teacher-scores:lib/scores/proposed-schema.ts
// (agreed shape: keep these column names so the teacher-scores and
// results-report-sheets features can share them). Publishing is per class and
// term in `results_published`; scores rows are never published individually.
// ---------------------------------------------------------------------------

export const scoreTerm = pgEnum("score_term", ["first", "second", "third"]);
export type ScoreTerm = (typeof scoreTerm.enumValues)[number];

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

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type TeacherAssignment = typeof teacherAssignments.$inferSelect;
export type NewTeacherAssignment = typeof teacherAssignments.$inferInsert;
export type Score = typeof scores.$inferSelect;
export type NewScore = typeof scores.$inferInsert;
export type ResultsPublished = typeof resultsPublished.$inferSelect;
export type NewResultsPublished = typeof resultsPublished.$inferInsert;
