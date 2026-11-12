import { and, asc, desc, eq, inArray, like } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  classes,
  invoiceItems,
  invoices,
  parentStudents,
  payments,
  students,
} from "@/lib/db/schema";

import type {
  Invoice,
  InvoiceLineItem,
  Parent,
  Payment,
  Student,
} from "./types";

const SAMPLE_PARENT_USER_ID = "sample-parent-user-001";

const SAMPLE_PARENT: Parent = {
  id: SAMPLE_PARENT_USER_ID,
  name: "Mrs. Ngozi Okafor",
  email: "ngozi.okafor@example.com",
  phone: "0803 555 0142",
};

type InvoiceRow = {
  id: string;
  studentId: string;
  invoiceNumber: string;
  title: string | null;
  session: string | null;
  term: string | null;
  issueDate: string;
  dueDate: string;
  totalAmount: string;
};

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  className: string;
  parentId: string;
};

type PaymentRow = {
  id: string;
  invoiceId: string;
  amount: string;
  reference: string | null;
  receiptNumber: string | null;
  balanceAfter: string | null;
  paidAt: Date;
};

const invoiceColumns = {
  id: invoices.id,
  studentId: invoices.studentId,
  invoiceNumber: invoices.invoiceNumber,
  title: invoices.title,
  session: invoices.session,
  term: invoices.term,
  issueDate: invoices.issueDate,
  dueDate: invoices.dueDate,
  totalAmount: invoices.totalAmount,
};

const paymentColumns = {
  id: payments.id,
  invoiceId: payments.invoiceId,
  amount: payments.amount,
  reference: payments.reference,
  receiptNumber: payments.receiptNumber,
  balanceAfter: payments.balanceAfter,
  paidAt: payments.paidAt,
};

function toNaira(value: string): number {
  return Number(value);
}

const receiptSequenceByYear = new Map<number, number>();
let receiptLock: Promise<void> = Promise.resolve();

function parseReceiptSequence(value: string | null, year: number): number {
  if (!value) {
    return 0;
  }

  const match = value.match(new RegExp(`^CHA-${year}-(\\d+)$`));

  return match ? Number(match[1]) : 0;
}

async function nextReceiptNumber(year: number): Promise<string> {
  const prefix = `CHA-${year}-`;
  const [latest] = await db
    .select({ receiptNumber: payments.receiptNumber })
    .from(payments)
    .where(like(payments.receiptNumber, `${prefix}%`))
    .orderBy(desc(payments.receiptNumber))
    .limit(1);

  const databaseMax = parseReceiptSequence(latest?.receiptNumber ?? null, year);
  const memoryMax = receiptSequenceByYear.get(year) ?? 0;
  const next = Math.max(databaseMax, memoryMax) + 1;

  receiptSequenceByYear.set(year, next);

  return `${prefix}${String(next).padStart(4, "0")}`;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

async function withReceiptLock<T>(task: () => Promise<T>): Promise<T> {
  const previous = receiptLock;
  let release: () => void = () => {};

  receiptLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await task();
  } finally {
    release();
  }
}

function mapStudent(row: StudentRow): Student {
  return {
    id: row.id,
    parentId: row.parentId,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    className: row.className,
    admissionNumber: row.admissionNumber,
  };
}

async function loadLineItems(
  invoiceIds: string[],
): Promise<Map<string, InvoiceLineItem[]>> {
  const grouped = new Map<string, InvoiceLineItem[]>();

  if (invoiceIds.length === 0) {
    return grouped;
  }

  const rows = await db
    .select({
      id: invoiceItems.id,
      invoiceId: invoiceItems.invoiceId,
      description: invoiceItems.description,
      category: invoiceItems.category,
      amount: invoiceItems.amount,
    })
    .from(invoiceItems)
    .where(inArray(invoiceItems.invoiceId, invoiceIds))
    .orderBy(asc(invoiceItems.createdAt), asc(invoiceItems.id));

  for (const row of rows) {
    const items = grouped.get(row.invoiceId) ?? [];

    items.push({
      id: row.id,
      item: row.description,
      category: row.category ?? "Fees",
      amount: toNaira(row.amount),
      status: "not_paid",
    });

    grouped.set(row.invoiceId, items);
  }

  return grouped;
}

async function loadInvoices(rows: InvoiceRow[]): Promise<Invoice[]> {
  const lineItems = await loadLineItems(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    studentId: row.studentId,
    title: row.title ?? row.invoiceNumber,
    session: row.session ?? "",
    term: row.term ?? "",
    amountDue: toNaira(row.totalAmount),
    dueDate: row.dueDate,
    issuedAt: row.issueDate,
    lineItems: lineItems.get(row.id) ?? [],
  }));
}

function mapPayments(rows: PaymentRow[]): Payment[] {
  return rows.map((row) => ({
    id: row.id,
    invoiceId: row.invoiceId,
    amount: toNaira(row.amount),
    balanceAfter: row.balanceAfter ? toNaira(row.balanceAfter) : 0,
    paidAt: row.paidAt.toISOString(),
    method: "test",
    reference: row.reference ?? "",
    receiptNumber: row.receiptNumber ?? "",
    status: "successful",
  }));
}

async function getStudentIdsForParent(parentId: string): Promise<string[]> {
  const rows = await db
    .select({ studentId: parentStudents.studentId })
    .from(parentStudents)
    .where(eq(parentStudents.parentUserId, parentId));

  return rows.map((row) => row.studentId);
}

async function getInvoiceIdsForParent(parentId: string): Promise<string[]> {
  const studentIds = await getStudentIdsForParent(parentId);

  if (studentIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(inArray(invoices.studentId, studentIds));

  return rows.map((row) => row.id);
}

async function parentHasStudent(
  parentId: string,
  studentId: string,
): Promise<boolean> {
  const [link] = await db
    .select({ studentId: parentStudents.studentId })
    .from(parentStudents)
    .where(
      and(
        eq(parentStudents.parentUserId, parentId),
        eq(parentStudents.studentId, studentId),
      ),
    )
    .limit(1);

  return Boolean(link);
}

export async function getCurrentParent(): Promise<Parent> {
  return SAMPLE_PARENT;
}

export async function getParentById(
  parentId: string,
): Promise<Parent | undefined> {
  return parentId === SAMPLE_PARENT_USER_ID ? SAMPLE_PARENT : undefined;
}

export async function getStudentById(
  studentId: string,
): Promise<Student | undefined> {
  const [row] = await db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
      className: classes.name,
      parentId: parentStudents.parentUserId,
    })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(parentStudents, eq(parentStudents.studentId, students.id))
    .where(eq(students.id, studentId))
    .orderBy(asc(parentStudents.createdAt))
    .limit(1);

  return row ? mapStudent(row) : undefined;
}

export async function getStudentsForParent(
  parentId: string,
): Promise<Student[]> {
  const rows = await db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
      className: classes.name,
      parentId: parentStudents.parentUserId,
    })
    .from(parentStudents)
    .innerJoin(students, eq(parentStudents.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .where(eq(parentStudents.parentUserId, parentId))
    .orderBy(asc(students.firstName), asc(students.lastName));

  return rows.map(mapStudent);
}

export async function listInvoicesForStudent(
  studentId: string,
): Promise<Invoice[]> {
  const rows = await db
    .select(invoiceColumns)
    .from(invoices)
    .innerJoin(students, eq(invoices.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .where(eq(invoices.studentId, studentId))
    .orderBy(asc(invoices.dueDate));

  return loadInvoices(rows);
}

export async function listInvoicesForParent(
  parentId: string,
): Promise<Invoice[]> {
  const studentIds = await getStudentIdsForParent(parentId);

  if (studentIds.length === 0) {
    return [];
  }

  const rows = await db
    .select(invoiceColumns)
    .from(invoices)
    .innerJoin(students, eq(invoices.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .where(inArray(invoices.studentId, studentIds))
    .orderBy(asc(invoices.dueDate));

  return loadInvoices(rows);
}

export async function getInvoiceById(
  invoiceId: string,
): Promise<Invoice | undefined> {
  const [row] = await db
    .select(invoiceColumns)
    .from(invoices)
    .innerJoin(students, eq(invoices.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!row) {
    return undefined;
  }

  const [invoice] = await loadInvoices([row]);

  return invoice;
}

export async function getInvoiceForParent(
  parentId: string,
  invoiceId: string,
): Promise<Invoice | undefined> {
  const invoice = await getInvoiceById(invoiceId);

  if (!invoice) {
    return undefined;
  }

  return (await parentHasStudent(parentId, invoice.studentId))
    ? invoice
    : undefined;
}

export async function listPaymentsForInvoice(
  invoiceId: string,
): Promise<Payment[]> {
  const rows = await db
    .select(paymentColumns)
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(eq(payments.invoiceId, invoiceId))
    .orderBy(
      asc(payments.paidAt),
      asc(payments.createdAt),
      asc(payments.id),
    );

  return mapPayments(rows).sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

export async function listPaymentsForParent(
  parentId: string,
): Promise<Payment[]> {
  const invoiceIds = await getInvoiceIdsForParent(parentId);

  if (invoiceIds.length === 0) {
    return [];
  }

  const rows = await db
    .select(paymentColumns)
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(inArray(payments.invoiceId, invoiceIds))
    .orderBy(
      asc(payments.paidAt),
      asc(payments.createdAt),
      asc(payments.id),
    );

  return mapPayments(rows).sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

export async function getPaymentById(
  paymentId: string,
): Promise<Payment | undefined> {
  const [target] = await db
    .select({ invoiceId: payments.invoiceId })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!target) {
    return undefined;
  }

  const invoicePayments = await listPaymentsForInvoice(target.invoiceId);

  return invoicePayments.find((payment) => payment.id === paymentId);
}

export async function getPaymentForParent(
  parentId: string,
  paymentId: string,
): Promise<Payment | undefined> {
  const payment = await getPaymentById(paymentId);

  if (!payment) {
    return undefined;
  }

  const invoice = await getInvoiceById(payment.invoiceId);

  if (!invoice) {
    return undefined;
  }

  return (await parentHasStudent(parentId, invoice.studentId))
    ? payment
    : undefined;
}

export async function recordTestPayment(input: {
  invoiceId: string;
  amount: number;
  balanceAfter: number;
}): Promise<Payment> {
  const [invoice] = await db
    .select({ totalAmount: invoices.totalAmount })
    .from(invoices)
    .where(eq(invoices.id, input.invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const balanceAfter = input.balanceAfter;

  const id = crypto.randomUUID();
  const paidAt = new Date();
  const year = paidAt.getUTCFullYear();

  return withReceiptLock<Payment>(async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const receiptNumber = await nextReceiptNumber(year);
      const reference = `TEST-${receiptNumber}`;

      try {
        await db.insert(payments).values({
          id,
          invoiceId: input.invoiceId,
          amount: input.amount.toFixed(2),
          method: "test",
          reference,
          receiptNumber,
          balanceAfter: balanceAfter.toFixed(2),
          status: "success",
          paidAt,
        });

        return {
          id,
          invoiceId: input.invoiceId,
          amount: input.amount,
          balanceAfter,
          paidAt: paidAt.toISOString(),
          method: "test",
          reference,
          receiptNumber,
          status: "successful",
        };
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }

        lastError = error;
        receiptSequenceByYear.delete(year);
      }
    }

    throw lastError ?? new Error("Could not allocate a receipt number.");
  });
}
