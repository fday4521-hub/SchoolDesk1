import { CA_MAX, calculateScore, EXAM_MAX } from "@/lib/scores/grading";
import {
  getTeacherAssignments,
  TEMP_TEACHER_ID,
  type ScoreTerm,
} from "@/lib/scores/data";

export const TERMS: ScoreTerm[] = ["first", "second", "third"];

export type ScoreInput = {
  studentId: string;
  caScore: number;
  examScore: number;
  total: number;
  grade: string;
};

export type ScoresRequest = {
  classId: string;
  subjectId: string;
  term: ScoreTerm;
  rows: ScoreInput[];
};

export type ValidationResult =
  | { ok: true; value: ScoresRequest }
  | { ok: false; errors: Record<string, string> };

function scoreNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (
    typeof value !== "string" ||
    !/^-?(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(value.trim())
  ) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateScoresRequest(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, errors: { form: "Send a valid scores request." } };
  }

  const body = input as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const classId = typeof body.classId === "string" ? body.classId : "";
  const subjectId = typeof body.subjectId === "string" ? body.subjectId : "";
  const term = body.term;
  if (!classId) errors.form = "Choose a class.";
  if (!subjectId) errors.form = "Choose a subject.";
  if (typeof term !== "string" || !TERMS.includes(term as ScoreTerm)) {
    errors.form = "Choose a valid term.";
  }
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    errors.form = "There are no student scores to save.";
  }
  if (errors.form) return { ok: false, errors };

  const rows: ScoreInput[] = [];
  for (const [index, rawRow] of (body.rows as unknown[]).entries()) {
    const row = rawRow && typeof rawRow === "object"
      ? (rawRow as Record<string, unknown>)
      : {};
    const studentId = typeof row.studentId === "string" ? row.studentId : "";
    const rowKey = studentId || `row-${index + 1}`;
    const caScore = scoreNumber(row.caScore);
    const examScore = scoreNumber(row.examScore);
    const messages: string[] = [];
    if (!studentId) messages.push("Student is missing.");
    if (caScore === null) messages.push("Enter a numeric CA score.");
    else if (caScore < 0 || caScore > CA_MAX) {
      messages.push(`CA score must be between 0 and ${CA_MAX}.`);
    }
    if (examScore === null) messages.push("Enter a numeric exam score.");
    else if (examScore < 0 || examScore > EXAM_MAX) {
      messages.push(`Exam score must be between 0 and ${EXAM_MAX}.`);
    }
    if (messages.length) {
      errors[rowKey] = messages.join(" ");
      continue;
    }
    const result = calculateScore(caScore!, examScore!);
    rows.push({ studentId, caScore: caScore!, examScore: examScore!, ...result });
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { classId, subjectId, term: term as ScoreTerm, rows },
  };
}

export async function teacherHasAssignment(
  teacherId: string,
  classId: string,
  subjectId: string,
) {
  const assignments = await getTeacherAssignments(teacherId);
  return assignments.some(
    (assignment) =>
      assignment.teacherUserId === teacherId &&
      assignment.classId === classId &&
      assignment.subjectId === subjectId,
  );
}

// TEMP: use the single placeholder until Better Auth provides a session user.
export function getCurrentTeacherId() {
  return TEMP_TEACHER_ID;
}
