import "dotenv/config";

import { db } from "./index";
import { invoices, invoiceItems, payments } from "./schema";
import { eq, isNull, or } from "drizzle-orm";

const receiptNumbers = {
  chidiFees: "CHA-2026-0001",
  ngoziFees: "CHA-2026-0002",
} as const;

async function backfillFees() {
  // Fill invoices where new columns are empty
  await db
    .update(invoices)
    .set({
      title: "School Fees - First Term",
      session: "2025/2026",
      term: "First Term",
    })
    .where(
      or(
        isNull(invoices.title),
        isNull(invoices.session),
        isNull(invoices.term),
      ),
    );

  // Specifically set for the 3 seeded invoices if not already set
  await db
    .update(invoices)
    .set({
      title: "School Fees - First Term",
      session: "2025/2026",
      term: "First Term",
    })
    .where(eq(invoices.invoiceNumber, "INV-2026-0001"));

  await db
    .update(invoices)
    .set({
      title: "School Fees - First Term",
      session: "2025/2026",
      term: "First Term",
    })
    .where(eq(invoices.invoiceNumber, "INV-2026-0002"));

  await db
    .update(invoices)
    .set({
      title: "School Bus - First Term",
      session: "2025/2026",
      term: "First Term",
    })
    .where(eq(invoices.invoiceNumber, "INV-2026-0003"));

  // Fill invoice items categories where empty
  await db
    .update(invoiceItems)
    .set({ category: "Fees" })
    .where(isNull(invoiceItems.category));

  // Fill payments for the 3 seeded invoices
  // INV-2026-0001 had partial payment of 100000.00, total 175000.00
  await db
    .update(payments)
    .set({
      receiptNumber: receiptNumbers.chidiFees,
      balanceAfter: "75000.00",
      status: "success",
    })
    .where(eq(payments.reference, "SAMPLE-TRANSFER-001"));

  // INV-2026-0002 paid in full
  await db
    .update(payments)
    .set({
      receiptNumber: receiptNumbers.ngoziFees,
      balanceAfter: "0.00",
      status: "success",
    })
    .where(eq(payments.reference, "SAMPLE-PAYSTACK-002"));

  console.log("Fees backfill complete.");
}

backfillFees()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fees backfill failed:", error);
    process.exit(1);
  });
