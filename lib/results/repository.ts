import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  classes,
  parentStudents,
  resultsPublished,
  students,
  user,
  type ResultsPublished,
} from "@/lib/db/schema";
import type { ScoreTerm } from "@/lib/db/schema";

export type PublishedRow = {
  id: string;
  classId: string;
  className: string;
  academicYear: string;
  term: ScoreTerm;
  updatedAt: Date;
};

/** Every class + term whose results are currently visible to parents. */
export async function listPublishedResults(): Promise<PublishedRow[]> {
  return db
    .select({
      id: resultsPublished.id,
      classId: resultsPublished.classId,
      className: classes.name,
      academicYear: classes.academicYear,
      term: resultsPublished.term,
      updatedAt: resultsPublished.updatedAt,
    })
    .from(resultsPublished)
    .innerJoin(classes, eq(resultsPublished.classId, classes.id))
    .where(eq(resultsPublished.published, true))
    .orderBy(asc(classes.name), asc(resultsPublished.term));
}

/**
 * Marks one class + term published (or hides it again). Safe to run twice:
 * the class_id + term pair is unique, so this updates the existing row.
 */
export async function setResultsPublished(
  classId: string,
  term: ScoreTerm,
  published: boolean,
): Promise<ResultsPublished | undefined> {
  const rows = await db
    .insert(resultsPublished)
    .values({ classId, term, published, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [resultsPublished.classId, resultsPublished.term],
      set: { published: sql`excluded.published`, updatedAt: sql`now()` },
    })
    .returning();
  return rows[0];
}

/** Hides one previously published class + term row by its id. */
export async function unpublishResults(
  id: string,
): Promise<ResultsPublished | undefined> {
  const rows = await db
    .update(resultsPublished)
    .set({ published: false, updatedAt: new Date() })
    .where(eq(resultsPublished.id, id))
    .returning();
  return rows[0];
}

export type ParentRecipient = {
  studentId: string;
  childName: string;
  parentName: string;
};

/**
 * The children of one class who have a linked parent account. Children with
 * no parent account are left out because there is nobody to notify.
 */
export async function listClassParentRecipients(
  classId: string,
): Promise<ParentRecipient[]> {
  return db
    .select({
      studentId: students.id,
      childName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
      parentName: user.name,
    })
    .from(students)
    .innerJoin(parentStudents, eq(parentStudents.studentId, students.id))
    .innerJoin(user, eq(user.id, parentStudents.parentUserId))
    .where(and(eq(students.classId, classId), eq(user.role, "parent")))
    .orderBy(asc(students.lastName), asc(students.firstName));
}

export async function classExists(classId: string): Promise<boolean> {
  const rows = await db
    .select({ id: classes.id })
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1);
  return rows.length > 0;
}
