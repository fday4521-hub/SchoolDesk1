import "server-only";

import { asc, count, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { classes, students, user } from "@/lib/db/schema";

// Feature 9: read-only lists for the school admin page — classes, students
// and teachers. Writing/downstream features will add more later.

/** Classes with how many students are in each, newest first. */
export async function listClassesWithCounts() {
  return db
    .select({
      id: classes.id,
      name: classes.name,
      level: classes.level,
      academicYear: classes.academicYear,
      studentCount: count(students.id),
    })
    .from(classes)
    .leftJoin(students, eq(students.classId, classes.id))
    .groupBy(classes.id)
    .orderBy(asc(classes.academicYear), asc(classes.name));
}

/** Every student with their class name, grouped by class. */
export async function listStudentsWithClasses() {
  return db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
      className: classes.name,
    })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .orderBy(asc(students.lastName), asc(students.firstName));
}

/** Teacher accounts: user rows whose role is "teacher". */
export async function listTeachers() {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(user)
    .where(eq(user.role, "teacher"))
    .orderBy(asc(user.name));
}
