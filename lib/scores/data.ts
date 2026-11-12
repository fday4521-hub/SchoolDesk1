import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { classes, students } from "@/lib/db/schema";

export const TEMP_TEACHER_ID = "temp-teacher-001";

export type ScoreTerm = "first" | "second" | "third";

export type ScoreRecord = {
  studentId: string;
  subjectId: string;
  classId: string;
  term: ScoreTerm;
  caScore: number;
  examScore: number;
  total: number;
  grade: string;
  enteredBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SubjectRecord = { id: string; name: string };
export type AssignmentRecord = {
  teacherUserId: string;
  classId: string;
  subjectId: string;
};

// TEMP: These server-memory stand-ins remain until the proposed tables exist.
const TEMP_SUBJECTS: SubjectRecord[] = [
  { id: "00000000-0000-4000-8000-000000000001", name: "Mathematics" },
  { id: "00000000-0000-4000-8000-000000000002", name: "English Language" },
  { id: "00000000-0000-4000-8000-000000000003", name: "Basic Science" },
];
const TEMP_SCORES = new Map<string, ScoreRecord>();
const TEMP_PUBLISHED = new Set<string>();

function scoreKey(studentId: string, subjectId: string, term: ScoreTerm) {
  return `${studentId}:${subjectId}:${term}`;
}

export async function getClasses() {
  return db.select().from(classes).orderBy(classes.name);
}

export async function getStudents(classId: string) {
  return db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
      classId: students.classId,
    })
    .from(students)
    .where(eq(students.classId, classId))
    .orderBy(students.lastName, students.firstName);
}

// TEMP: subject catalog stand-in; replace with a subjects table query.
export async function getSubjects() {
  return TEMP_SUBJECTS;
}

// TEMP: placeholder teacher is assigned every subject in each existing class.
// This lets the feature be reviewed before Better Auth and assignment tables exist.
export async function getTeacherAssignments(
  teacherUserId: string,
): Promise<AssignmentRecord[]> {
  if (teacherUserId !== TEMP_TEACHER_ID) return [];
  const classRows = await getClasses();
  return classRows.flatMap((classRow) =>
    TEMP_SUBJECTS.map((subject) => ({
      teacherUserId,
      classId: classRow.id,
      subjectId: subject.id,
    })),
  );
}

// TEMP: in-memory scores disappear when the server process restarts.
export async function getScores(
  classId: string,
  subjectId: string,
  term: ScoreTerm,
) {
  return [...TEMP_SCORES.values()].filter(
    (score) =>
      score.classId === classId &&
      score.subjectId === subjectId &&
      score.term === term,
  );
}

export async function saveScores(rows: ScoreRecord[]) {
  for (const row of rows) {
    const key = scoreKey(row.studentId, row.subjectId, row.term);
    const existing = TEMP_SCORES.get(key);
    TEMP_SCORES.set(key, {
      ...row,
      createdAt: existing?.createdAt ?? row.createdAt,
    });
  }
}

// TEMP: result publishing stand-in; no UI currently publishes results.
export async function isResultsPublished(classId: string, term: ScoreTerm) {
  return TEMP_PUBLISHED.has(`${classId}:${term}`);
}

// TEMP helper for review and future integration; publishing UI is not in scope.
export async function setResultsPublished(
  classId: string,
  term: ScoreTerm,
  published: boolean,
) {
  const key = `${classId}:${term}`;
  if (published) TEMP_PUBLISHED.add(key);
  else TEMP_PUBLISHED.delete(key);
}
