export const CA_MAX = 40;
export const EXAM_MAX = 60;

export function getGrade(total: number): string {
  if (total >= 70) return "A";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  if (total >= 45) return "D";
  if (total >= 40) return "E";
  return "F";
}

export function calculateScore(caScore: number, examScore: number) {
  const total = caScore + examScore;
  return { total, grade: getGrade(total) };
}
