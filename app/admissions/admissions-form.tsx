"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

type CandidateDetails = {
  childFullName: string;
  dateOfBirth: string;
  gender: string;
  classApplyingFor: string;
  parentFullName: string;
  parentPhoneNumber: string;
  parentEmail: string;
};

type DocumentKey =
  | "birthCertificate"
  | "lastSchoolReport"
  | "passportPhotograph";

type DocumentFiles = Record<DocumentKey, File | null>;
type DocumentErrors = Partial<Record<DocumentKey, string>>;

const initialValues: CandidateDetails = {
  childFullName: "",
  dateOfBirth: "",
  gender: "",
  classApplyingFor: "",
  parentFullName: "",
  parentPhoneNumber: "",
  parentEmail: "",
};

const initialDocuments: DocumentFiles = {
  birthCertificate: null,
  lastSchoolReport: null,
  passportPhotograph: null,
};

const classOptions = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];

const steps = [
  "Candidate details",
  "Documents",
  "Application fee",
  "Entrance exam",
  "Pass slip",
];

const documentFields: { name: DocumentKey; label: string }[] = [
  { name: "birthCertificate", label: "Birth certificate" },
  { name: "lastSchoolReport", label: "Last school report" },
  { name: "passportPhotograph", label: "Passport photograph" },
];

const fileTypeError = "Please upload a PDF, JPG or PNG.";
const draftSavedMessage =
  "Your draft has been saved. You can come back to finish it.";

const acceptedFileTypes =
  ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const allowedFileExtension = /\.(pdf|jpe?g|png)$/i;

const labelClasses = "mb-2 block text-sm font-medium text-[#0B1F3A]";

const uploadLabelClasses =
  "mb-2 flex items-center text-sm font-medium text-[#0B1F3A]";

const fieldClasses =
  "h-12 w-full rounded-xl border border-[#CBD5E1] bg-white px-4 text-base text-[#0B1F3A] outline-none transition focus:border-[#0B1F3A] focus:ring-2 focus:ring-[#C9A227]/40";

const fileInputClasses =
  "block w-full cursor-pointer text-sm text-[#475569] file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#0B1F3A] file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[#14315C] focus:outline-none";

const applicationFee = "₦5,000";
const paymentNotice = "Test mode: no real money is charged.";
const paymentReceivedMessage = "Payment received. Thank you.";
const examDate = "Saturday, 16 Jan 2027";

const headingStyle = { fontFamily: "var(--font-poppins)" };

const primaryButtonClasses =
  "inline-flex h-12 items-center justify-center rounded-xl bg-[#0B1F3A] px-8 text-base font-semibold text-white shadow-sm transition hover:bg-[#14315C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2 active:scale-[0.99]";

const secondaryButtonClasses =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 bg-white px-6 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2 active:scale-[0.99]";

const actionRowClasses =
  "flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end print:hidden";

function createApplicationNumber() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const randomValues = crypto.getRandomValues(new Uint32Array(1));
    return `CHA-2027-${String(randomValues[0] % 100000).padStart(5, "0")}`;
  }

  return `CHA-2027-${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`;
}

function isAllowedFile(file: File) {
  if (allowedMimeTypes.has(file.type)) {
    return true;
  }

  const typeIsUnknown =
    file.type === "" || file.type === "application/octet-stream";

  return typeIsUnknown && allowedFileExtension.test(file.name);
}

function StepBar({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Application steps" className="print:hidden">
      <ol className="flex flex-col gap-3 sm:grid sm:grid-cols-5 sm:gap-0">
        {steps.map((step, index) => {
          const isCurrent = index === currentStep - 1;
          const isComplete = index < currentStep - 1;

          return (
            <li
              key={step}
              aria-current={isCurrent ? "step" : undefined}
              className="relative flex items-center gap-3 sm:flex-col sm:gap-2 sm:px-0.5 sm:text-center"
            >
              {index < steps.length - 1 && (
                <>
                  <span
                    aria-hidden="true"
                    className={`absolute left-4 top-8 h-3 w-0.5 sm:hidden ${
                      isComplete ? "bg-[#C9A227]" : "bg-[#E2E8F0]"
                    }`}
                  />
                  <span
                    aria-hidden="true"
                    className={`absolute left-1/2 top-[18px] hidden h-0.5 w-full sm:block ${
                      isComplete ? "bg-[#C9A227]" : "bg-[#E2E8F0]"
                    }`}
                  />
                </>
              )}
              <span
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:h-9 sm:w-9 sm:text-sm ${
                  isCurrent
                    ? "bg-[#0B1F3A] text-white ring-4 ring-[#C9A227]/30"
                    : isComplete
                      ? "bg-[#C9A227] text-[#0B1F3A]"
                      : "border border-[#CBD5E1] bg-white text-[#64748B]"
                }`}
              >
                {index + 1}
              </span>
              <span
                className={`relative z-10 text-sm leading-tight sm:text-sm ${
                  isCurrent
                    ? "font-semibold text-[#0B1F3A]"
                    : isComplete
                      ? "font-medium text-[#0B1F3A]"
                      : "font-medium text-[#64748B]"
                }`}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
    >
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-[#C9A227]"
    >
      <path d="m4 10.5 4 4 8-9" />
    </svg>
  );
}

export default function AdmissionsForm() {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<CandidateDetails>(initialValues);
  const [documents, setDocuments] = useState<DocumentFiles>(initialDocuments);
  const [documentErrors, setDocumentErrors] = useState<DocumentErrors>({});
  const [saved, setSaved] = useState(false);
  const [draftMessage, setDraftMessage] = useState(false);
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState("");
  const sectionRef = useRef<HTMLDivElement>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (step > 1) {
      sectionRef.current?.scrollIntoView({ block: "start" });
    }
  }, [step]);

  useEffect(() => {
    if (paymentReceived && step === 3) {
      continueButtonRef.current?.focus();
    }
  }, [paymentReceived, step]);

  function clearSavedState() {
    setSaved(false);
    setDraftMessage(false);
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;

    setValues((current) => ({
      ...current,
      [name]: value,
    }));

    clearSavedState();
  }

  function handleFileChange(
    name: DocumentKey,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      setDocuments((current) => ({ ...current, [name]: null }));
      setDocumentErrors((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
      return;
    }

    if (!isAllowedFile(file)) {
      event.target.value = "";
      setDocuments((current) => ({ ...current, [name]: null }));
      setDocumentErrors((current) => ({
        ...current,
        [name]: fileTypeError,
      }));
      clearSavedState();
      return;
    }

    setDocuments((current) => ({ ...current, [name]: file }));
    setDocumentErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    clearSavedState();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step === 1) {
      setStep(2);
      clearSavedState();
      return;
    }

    if (step === 2) {
      setStep(3);
      clearSavedState();
      return;
    }

    if (step === 3 && paymentReceived) {
      setStep(4);
      return;
    }

    if (step === 4) {
      setApplicationNumber(createApplicationNumber());
      setStep(5);
    }
  }

  function handleSaveDraft() {
    setSaved(true);
    setDraftMessage(true);
  }

  return (
    <div ref={sectionRef}>
      <StepBar currentStep={step} />
      <div className="my-7 h-px bg-[#E6EBF1] print:hidden" aria-hidden="true" />

      <form
        aria-labelledby="admissions-title"
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {step === 1 && (
          <>
            <div>
              <label htmlFor="childFullName" className={labelClasses}>
                Child&apos;s full name
              </label>
              <input
                id="childFullName"
                name="childFullName"
                type="text"
                required
                autoComplete="off"
                value={values.childFullName}
                onChange={handleChange}
                className={fieldClasses}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="dateOfBirth" className={labelClasses}>
                  Date of birth
                </label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  required
                  value={values.dateOfBirth}
                  onChange={handleChange}
                  className={fieldClasses}
                />
              </div>

              <div>
                <label htmlFor="gender" className={labelClasses}>
                  Gender
                </label>
                <div className="relative">
                  <select
                    id="gender"
                    name="gender"
                    required
                    value={values.gender}
                    onChange={handleChange}
                    className={`${fieldClasses} appearance-none pr-11`}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  <ChevronIcon />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="classApplyingFor" className={labelClasses}>
                Class applying for
              </label>
              <div className="relative">
                <select
                  id="classApplyingFor"
                  name="classApplyingFor"
                  required
                  value={values.classApplyingFor}
                  onChange={handleChange}
                  className={`${fieldClasses} appearance-none pr-11`}
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {classOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
            </div>

            <div>
              <label htmlFor="parentFullName" className={labelClasses}>
                Parent full name
              </label>
              <input
                id="parentFullName"
                name="parentFullName"
                type="text"
                required
                autoComplete="name"
                value={values.parentFullName}
                onChange={handleChange}
                className={fieldClasses}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="parentPhoneNumber" className={labelClasses}>
                  Parent phone number
                </label>
                <input
                  id="parentPhoneNumber"
                  name="parentPhoneNumber"
                  type="tel"
                  inputMode="tel"
                  required
                  autoComplete="tel"
                  value={values.parentPhoneNumber}
                  onChange={handleChange}
                  className={fieldClasses}
                />
              </div>

              <div>
                <label htmlFor="parentEmail" className={labelClasses}>
                  Parent email
                </label>
                <input
                  id="parentEmail"
                  name="parentEmail"
                  type="email"
                  required
                  autoComplete="email"
                  value={values.parentEmail}
                  onChange={handleChange}
                  className={fieldClasses}
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {documentFields.map((field) => {
              const selectedFile = documents[field.name];
              const error = documentErrors[field.name];

              return (
                <div key={field.name}>
                  <label
                    htmlFor={field.name}
                    className={`${uploadLabelClasses} justify-between gap-3`}
                  >
                    <span>{field.label}</span>
                    {selectedFile && <CheckIcon />}
                  </label>
                  <div
                    className={`rounded-xl border border-dashed p-3 transition focus-within:ring-2 focus-within:ring-[#C9A227]/40 ${
                      error
                        ? "border-[#B42318] bg-[#FEF3F2]"
                        : "border-[#CBD5E1] bg-[#F8FAFC] focus-within:border-[#0B1F3A]"
                    }`}
                  >
                    <input
                      id={field.name}
                      name={field.name}
                      type="file"
                      accept={acceptedFileTypes}
                      onChange={(event) =>
                        handleFileChange(field.name, event)
                      }
                      aria-invalid={Boolean(error)}
                      aria-describedby={
                        error ? `${field.name}-error` : undefined
                      }
                      className={fileInputClasses}
                    />
                  </div>
                  {error && (
                    <p
                      id={`${field.name}-error`}
                      role="alert"
                      className="mt-2 text-sm font-medium text-[#B42318]"
                    >
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
          </>
        )}

        {step === 3 && (
          <>
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-6">
              <p className="text-sm font-medium text-[#475569]">
                Application fee
              </p>
              <p
                className="mt-1 text-3xl font-semibold tracking-tight text-[#0B1F3A]"
                style={headingStyle}
              >
                {applicationFee}
              </p>
              <p className="mt-3 border-t border-[#E2E8F0] pt-3 text-sm leading-relaxed text-[#475569]">
                {paymentNotice}
              </p>
            </div>

            {paymentReceived && (
              <p
                role="status"
                className="rounded-xl border border-[#C9A227]/40 bg-[#FFF9E6] px-4 py-3 text-sm font-medium leading-relaxed text-[#0B1F3A]"
              >
                {paymentReceivedMessage}
              </p>
            )}
          </>
        )}

        {step === 4 && (
          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-6">
            <p className="text-sm font-medium text-[#475569]">Entrance exam</p>
            <p
              className="mt-1 text-2xl font-semibold tracking-tight text-[#0B1F3A]"
              style={headingStyle}
            >
              {examDate}
            </p>
          </div>
        )}

        {step === 5 && (
          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white print:rounded-none print:border-0">
            <div className="border-b border-[#E2E8F0] bg-[#0B1F3A] px-5 py-4 text-white print:border-[#0B1F3A] print:bg-white print:text-[#0B1F3A] sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227] print:text-[#0B1F3A]">
                Crown Heights Academy
              </p>
              <p
                className="mt-1 text-xl font-semibold tracking-tight"
                style={headingStyle}
              >
                Entrance exam pass slip
              </p>
            </div>

            <dl className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-6">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#475569]">
                  Child&apos;s name
                </dt>
                <dd className="mt-1 text-base font-medium text-[#0B1F3A]">
                  {values.childFullName}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#475569]">
                  Class
                </dt>
                <dd className="mt-1 text-base font-medium text-[#0B1F3A]">
                  {values.classApplyingFor}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#475569]">
                  Application number
                </dt>
                <dd className="mt-1 text-base font-semibold tracking-wide text-[#0B1F3A] tabular-nums">
                  {applicationNumber}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#475569]">
                  Exam date
                </dt>
                <dd className="mt-1 text-base font-medium text-[#0B1F3A]">
                  {examDate}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {step <= 2 && draftMessage && (
          <p
            role="status"
            className="rounded-xl border border-[#C9A227]/40 bg-[#FFF9E6] px-4 py-3 text-sm leading-relaxed text-[#0B1F3A] print:hidden"
          >
            {draftSavedMessage}
          </p>
        )}

        {step <= 2 && (
          <div className={actionRowClasses}>
            <button
              type="button"
              onClick={handleSaveDraft}
              className={`${secondaryButtonClasses} ${
                saved
                  ? "border-[#C9A227] text-[#0B1F3A]"
                  : "border-[#0B1F3A] text-[#0B1F3A] hover:bg-[#F1F5F9]"
              }`}
            >
              {saved && <CheckIcon />}
              Save draft
            </button>

            <button type="submit" className={primaryButtonClasses}>
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className={actionRowClasses}>
            {paymentReceived ? (
              <button
                ref={continueButtonRef}
                type="submit"
                className={primaryButtonClasses}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPaymentReceived(true)}
                className={primaryButtonClasses}
              >
                Pay application fee
              </button>
            )}
          </div>
        )}

        {step === 4 && (
          <div className={actionRowClasses}>
            <button type="submit" className={primaryButtonClasses}>
              Continue
            </button>
          </div>
        )}

        {step === 5 && (
          <div className={actionRowClasses}>
            <button
              type="button"
              onClick={() => window.print()}
              className={primaryButtonClasses}
            >
              Download pass slip
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
