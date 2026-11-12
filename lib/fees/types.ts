export type Parent = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type Student = {
  id: string;
  parentId: string;
  fullName: string;
  className: string;
  admissionNumber: string;
};

export type FeeItemStatus = "paid" | "not_paid";

export type InvoiceLineItem = {
  id: string;
  item: string;
  category: string;
  amount: number;
  status: FeeItemStatus;
};

export type Invoice = {
  id: string;
  studentId: string;
  title: string;
  session: string;
  term: string;
  amountDue: number;
  dueDate: string;
  issuedAt: string;
  lineItems: InvoiceLineItem[];
};

export type InvoiceStatus = "unpaid" | "partial" | "paid";

export type Payment = {
  id: string;
  invoiceId: string;
  amount: number;
  balanceAfter: number;
  paidAt: string;
  method: "test";
  reference: string;
  receiptNumber: string;
  status: "successful";
};
