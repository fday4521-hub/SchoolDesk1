import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import AdmissionsForm from "./admissions-form";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Apply to Crown Heights Academy",
};

export default function AdmissionsPage() {
  return (
    <div
      className={`${inter.variable} ${poppins.variable} flex min-h-screen flex-1 flex-col bg-white text-[#0B1F3A] [color-scheme:light] [font-family:var(--font-inter)]`}
    >
      <header className="relative bg-[#0B1F3A] print:hidden">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-[#C9A227]"
        />
        <div className="mx-auto w-full max-w-3xl px-4 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-14">
          <span
            aria-hidden="true"
            className="mb-4 block h-1 w-12 rounded-full bg-[#C9A227]"
          />
          <h1
            id="admissions-title"
            className={`${poppins.className} text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl`}
          >
            Apply to Crown Heights Academy
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6 print:mx-0 print:max-w-none print:px-0 print:pb-0">
        <div className="relative z-10 -mt-8 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_40px_-24px_rgba(11,31,58,0.35)] sm:-mt-10 sm:p-8 print:mt-0 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <AdmissionsForm />
        </div>
      </main>
    </div>
  );
}
