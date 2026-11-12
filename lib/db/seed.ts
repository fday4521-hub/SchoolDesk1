import "dotenv/config";

import { db } from "./index";
import {
  attendanceRecords,
  classes,
  invoiceItems,
  invoices,
  parentStudents,
  payments,
  students,
} from "./schema";

// A single shared sample set for local development and previews.
// Safe to run more than once: existing rows are left untouched.

const ids = {
  classes: {
    jss1a: "c0000000-0000-4000-8000-000000000001",
    jss2b: "c0000000-0000-4000-8000-000000000002",
  },
  students: {
    chidi: "d0000000-0000-4000-8000-000000000001",
    ngozi: "d0000000-0000-4000-8000-000000000002",
  },
  attendance: {
    chidiOct20: "b0000000-0000-4000-8000-000000000001",
    ngoziOct20: "b0000000-0000-4000-8000-000000000002",
  },
  invoices: {
    chidiFees: "e0000000-e000-4000-8000-000000000001",
    ngoziFees: "e0000000-e000-4000-8000-000000000002",
    chidiBus: "e0000000-e000-4000-8000-000000000003",
  },
  invoiceItems: {
    chidiTuition: "f0000000-f000-4000-8000-000000000001",
    chidiBooks: "f0000000-f000-4000-8000-000000000002",
    ngoziTuition: "f0000000-f000-4000-8000-000000000003",
    ngoziLab: "f0000000-f000-4000-8000-000000000004",
    chidiBus: "f0000000-f000-4000-8000-000000000005",
  },
  payments: {
    chidiPartPayment: "a0000000-a000-4000-8000-000000000001",
    ngoziFullPayment: "a0000000-a000-4000-8000-000000000002",
  },
} as const;

const sampleParentUserId = "sample-parent-user-001";
const sampleTeacherUserId = "demo-teacher-user-001";

async function seed() {
  await db
    .insert(classes)
    .values([
      {
        id: ids.classes.jss1a,
        name: "JSS 1A",
        level: "JSS 1",
        academicYear: "2025/2026",
      },
      {
        id: ids.classes.jss2b,
        name: "JSS 2B",
        level: "JSS 2",
        academicYear: "2025/2026",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(students)
    .values([
      {
        id: ids.students.chidi,
        firstName: "Chidi",
        lastName: "Okafor",
        admissionNumber: "CHA/2025/001",
        dateOfBirth: "2013-04-12",
        classId: ids.classes.jss1a,
      },
      {
        id: ids.students.ngozi,
        firstName: "Ngozi",
        lastName: "Okafor",
        admissionNumber: "CHA/2024/014",
        dateOfBirth: "2012-09-03",
        classId: ids.classes.jss2b,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(parentStudents)
    .values([
      {
        parentUserId: sampleParentUserId,
        studentId: ids.students.chidi,
        relationship: "mother",
      },
      {
        parentUserId: sampleParentUserId,
        studentId: ids.students.ngozi,
        relationship: "mother",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(attendanceRecords)
    .values([
      {
        id: ids.attendance.chidiOct20,
        studentId: ids.students.chidi,
        attendanceDate: "2026-10-20",
        status: "absent",
        markedBy: sampleTeacherUserId,
      },
      {
        id: ids.attendance.ngoziOct20,
        studentId: ids.students.ngozi,
        attendanceDate: "2026-10-20",
        status: "present",
        markedBy: sampleTeacherUserId,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(invoices)
    .values([
      {
        id: ids.invoices.chidiFees,
        studentId: ids.students.chidi,
        invoiceNumber: "INV-2026-0001",
        status: "partial",
        issueDate: "2026-09-01",
        dueDate: "2026-09-30",
        totalAmount: "175000.00",
        notes: "First term fees",
        title: "School Fees - First Term",
        session: "2025/2026",
        term: "First Term",
      },
      {
        id: ids.invoices.ngoziFees,
        studentId: ids.students.ngozi,
        invoiceNumber: "INV-2026-0002",
        status: "paid",
        issueDate: "2026-09-01",
        dueDate: "2026-09-30",
        totalAmount: "165000.00",
        notes: "First term fees",
        title: "School Fees - First Term",
        session: "2025/2026",
        term: "First Term",
      },
      {
        id: ids.invoices.chidiBus,
        studentId: ids.students.chidi,
        invoiceNumber: "INV-2026-0003",
        status: "unpaid",
        issueDate: "2026-10-01",
        dueDate: "2026-10-15",
        totalAmount: "40000.00",
        notes: "School bus, first term",
        title: "School Bus - First Term",
        session: "2025/2026",
        term: "First Term",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(invoiceItems)
    .values([
      {
        id: ids.invoiceItems.chidiTuition,
        invoiceId: ids.invoices.chidiFees,
        description: "Tuition, first term",
        quantity: 1,
        unitAmount: "150000.00",
        amount: "150000.00",
        category: "Fees",
      },
      {
        id: ids.invoiceItems.chidiBooks,
        invoiceId: ids.invoices.chidiFees,
        description: "Textbooks",
        quantity: 1,
        unitAmount: "25000.00",
        amount: "25000.00",
        category: "Fees",
      },
      {
        id: ids.invoiceItems.ngoziTuition,
        invoiceId: ids.invoices.ngoziFees,
        description: "Tuition, first term",
        quantity: 1,
        unitAmount: "150000.00",
        amount: "150000.00",
        category: "Fees",
      },
      {
        id: ids.invoiceItems.ngoziLab,
        invoiceId: ids.invoices.ngoziFees,
        description: "Science lab fee",
        quantity: 1,
        unitAmount: "15000.00",
        amount: "15000.00",
        category: "Fees",
      },
      {
        id: ids.invoiceItems.chidiBus,
        invoiceId: ids.invoices.chidiBus,
        description: "School bus, first term",
        quantity: 1,
        unitAmount: "40000.00",
        amount: "40000.00",
        category: "Fees",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(payments)
    .values([
      {
        id: ids.payments.chidiPartPayment,
        invoiceId: ids.invoices.chidiFees,
        amount: "100000.00",
        method: "bank_transfer",
        reference: "SAMPLE-TRANSFER-001",
        receiptNumber: "CHA-2026-0001",
        balanceAfter: "75000.00",
        status: "success",
        paidAt: new Date("2026-09-10T10:30:00.000Z"),
      },
      {
        id: ids.payments.ngoziFullPayment,
        invoiceId: ids.invoices.ngoziFees,
        amount: "165000.00",
        method: "paystack",
        reference: "SAMPLE-PAYSTACK-002",
        receiptNumber: "CHA-2026-0002",
        balanceAfter: "0.00",
        status: "success",
        paidAt: new Date("2026-09-12T14:05:00.000Z"),
      },
    ])
    .onConflictDoNothing();

  console.log("Seed complete.");
  console.log(`Sample parent user id: ${sampleParentUserId}`);
  console.log("Children: Chidi Okafor (JSS 1A), Ngozi Okafor (JSS 2B)");
  console.log("Invoices: 3 (1 paid, 1 partial, 1 unpaid)");
  console.log("Attendance: 2 sample records (1 absence)");
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
