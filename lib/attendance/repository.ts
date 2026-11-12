import "server-only";

import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  attendanceRecords,
  classes,
  parentStudents,
  students,
  type AttendanceRecord,
  type AttendanceStatus,
} from "@/lib/db/schema";

export type ClassAttendanceRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  status: AttendanceStatus | null;
};

/** Lists a class roster and any attendance already recorded for that day. */
export async function listClassAttendance(
  classId: string,
  date: string,
): Promise<ClassAttendanceRow[]> {
  return db
    .select({
      studentId: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
      status: attendanceRecords.status,
    })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .leftJoin(
      attendanceRecords,
      and(
        eq(attendanceRecords.studentId, students.id),
        eq(attendanceRecords.attendanceDate, date),
      ),
    )
    .where(eq(classes.id, classId))
    .orderBy(asc(students.lastName), asc(students.firstName));
}

/** Lists the classes available to an attendance form. */
export async function listAttendanceClasses() {
  return db
    .select({ id: classes.id, name: classes.name, level: classes.level })
    .from(classes)
    .orderBy(asc(classes.name));
}

/**
 * Creates or corrects one daily record per student. Call only after the
 * server-side auth layer confirms the actor is allowed to mark this class.
 */
export async function saveClassAttendance(input: {
  classId: string;
  date: string;
  markedBy: string;
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    note?: string | null;
  }>;
}): Promise<AttendanceRecord[]> {
  if (input.records.length === 0) return [];

  const studentIds = input.records.map((record) => record.studentId);
  if (new Set(studentIds).size !== studentIds.length) {
    throw new Error("A student can only have one attendance status per day.");
  }

  const classStudents = await db
    .select({ id: students.id })
    .from(students)
    .where(
      and(eq(students.classId, input.classId), inArray(students.id, studentIds)),
    );
  if (classStudents.length !== studentIds.length) {
    throw new Error("One or more students do not belong to this class.");
  }

  const now = new Date();
  return db
    .insert(attendanceRecords)
    .values(
      input.records.map((record) => ({
        studentId: record.studentId,
        attendanceDate: input.date,
        status: record.status,
        note: record.note?.trim() || null,
        markedBy: input.markedBy,
        markedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: [attendanceRecords.studentId, attendanceRecords.attendanceDate],
      set: {
        status: sql`excluded.status`,
        note: sql`excluded.note`,
        markedBy: sql`excluded.marked_by`,
        markedAt: sql`excluded.marked_at`,
      },
    })
    .returning();
}

/**
 * Returns absences for a parent-linked child set. The caller must pass the
 * parent's authenticated Better Auth user ID, never an ID supplied by a form.
 */
const PARENT_ABSENCE_PAGE_SIZE = 50;

export async function listAbsencesForParent(
  parentUserId: string,
  requestedPage = 0,
) {
  const [countRow] = await db
    .select({ total: count() })
    .from(attendanceRecords)
    .innerJoin(students, eq(attendanceRecords.studentId, students.id))
    .innerJoin(parentStudents, eq(parentStudents.studentId, students.id))
    .where(
      and(
        eq(parentStudents.parentUserId, parentUserId),
        eq(attendanceRecords.status, "absent"),
      ),
    );

  const total = countRow?.total ?? 0;
  const pageCount = Math.ceil(total / PARENT_ABSENCE_PAGE_SIZE);
  const page = Math.min(
    Math.max(0, requestedPage),
    Math.max(0, pageCount - 1),
  );
  const absences = await db
    .select({
      studentId: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      className: classes.name,
      date: attendanceRecords.attendanceDate,
    })
    .from(attendanceRecords)
    .innerJoin(students, eq(attendanceRecords.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(parentStudents, eq(parentStudents.studentId, students.id))
    .where(
      and(
        eq(parentStudents.parentUserId, parentUserId),
        eq(attendanceRecords.status, "absent"),
      ),
    )
    .orderBy(
      desc(attendanceRecords.attendanceDate),
      asc(students.lastName),
      asc(students.firstName),
      asc(students.id),
    )
    .limit(PARENT_ABSENCE_PAGE_SIZE)
    .offset(page * PARENT_ABSENCE_PAGE_SIZE);

  return { absences, page, pageCount, total };
}
