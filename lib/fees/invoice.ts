import { formatNaira } from "./format";
import type {
  FeeItemStatus,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  Payment,
} from "./types";

export const MIN_PART_PAYMENT_NAIRA = 1_000;

export type InvoiceSummary = {
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: InvoiceStatus;
};

export type FeeTotals = {
  amountDue: number;
  amountPaid: number;
  balance: number;
};

export type InvoiceLineItemView = InvoiceLineItem & {
  status: FeeItemStatus;
};

export type PaymentValidation =
  | {
      ok: true;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      status: InvoiceStatus;
    }
  | {
      ok: false;
      error: string;
    };

export function getSuccessfulPayments(
  invoiceId: string,
  payments: Payment[],
): Payment[] {
  return payments.filter(
    (payment) =>
      payment.invoiceId === invoiceId && payment.status === "successful",
  );
}

export function getAmountPaid(invoiceId: string, payments: Payment[]): number {
  return getSuccessfulPayments(invoiceId, payments).reduce(
    (total, payment) => total + payment.amount,
    0,
  );
}

export function getBalance(amountDue: number, amountPaid: number): number {
  return Math.max(0, amountDue - amountPaid);
}

export function getInvoiceStatus(
  amountDue: number,
  amountPaid: number,
): InvoiceStatus {
  if (amountDue <= 0 || amountPaid >= amountDue) {
    return "paid";
  }

  if (amountPaid > 0) {
    return "partial";
  }

  return "unpaid";
}

export function getInvoiceSummary(
  invoice: Invoice,
  payments: Payment[],
): InvoiceSummary {
  const amountPaid = getAmountPaid(invoice.id, payments);

  return {
    amountDue: invoice.amountDue,
    amountPaid,
    balance: getBalance(invoice.amountDue, amountPaid),
    status: getInvoiceStatus(invoice.amountDue, amountPaid),
  };
}

export function getInvoiceLineItems(
  invoice: Invoice,
  payments: Payment[],
): InvoiceLineItemView[] {
  const fullyPaid = getInvoiceSummary(invoice, payments).status === "paid";

  return invoice.lineItems.map((lineItem) => ({
    ...lineItem,
    status: fullyPaid ? "paid" : lineItem.status,
  }));
}

export function getPaidPercentage(
  invoice: Invoice,
  payments: Payment[],
): number {
  const summary = getInvoiceSummary(invoice, payments);

  if (summary.amountDue <= 0) {
    return 100;
  }

  return Math.min(
    100,
    Math.round((summary.amountPaid / summary.amountDue) * 100),
  );
}

export function getFeeTotals(
  invoices: Invoice[],
  payments: Payment[],
): FeeTotals {
  return invoices.reduce<FeeTotals>(
    (totals, invoice) => {
      const summary = getInvoiceSummary(invoice, payments);

      return {
        amountDue: totals.amountDue + summary.amountDue,
        amountPaid: totals.amountPaid + summary.amountPaid,
        balance: totals.balance + summary.balance,
      };
    },
    { amountDue: 0, amountPaid: 0, balance: 0 },
  );
}

export function getMinimumPartPayment(balance: number): number {
  return Math.min(MIN_PART_PAYMENT_NAIRA, balance);
}

export function validatePayment(input: {
  invoice: Invoice;
  payments: Payment[];
  amount: number;
}): PaymentValidation {
  const { invoice, payments, amount } = input;
  const amountPaid = getAmountPaid(invoice.id, payments);
  const balance = getBalance(invoice.amountDue, amountPaid);

  if (balance <= 0) {
    return {
      ok: false,
      error: "This invoice is already fully paid.",
    };
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    return {
      ok: false,
      error: "Enter a valid amount in whole Naira.",
    };
  }

  if (amount > balance) {
    return {
      ok: false,
      error: `The outstanding balance is ${formatNaira(balance)}. You cannot pay more than that.`,
    };
  }

  const minimumPartPayment = getMinimumPartPayment(balance);

  if (amount < balance && amount < minimumPartPayment) {
    return {
      ok: false,
      error: `Part payments must be at least ${formatNaira(minimumPartPayment)}. You can also pay the full balance of ${formatNaira(balance)}.`,
    };
  }

  return {
    ok: true,
    amount,
    balanceBefore: balance,
    balanceAfter: balance - amount,
    status: getInvoiceStatus(invoice.amountDue, amountPaid + amount),
  };
}
