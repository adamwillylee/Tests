import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const sectionTitle = "mb-2 text-xs font-medium uppercase tracking-wide text-slate-500";
const inputClass =
  "ml-auto h-7 rounded-md border border-transparent bg-transparent px-1 text-right text-sm tabular-nums [appearance:textfield] hover:border-slate-200 focus:border-slate-300 focus:bg-white focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const PEOPLE = ["Morgan", "Taylor"] as const;
type Person = (typeof PEOPLE)[number];
type SaveStatus = "idle" | "saving" | "saved" | "error";

type Row = [string, number];

interface YtdPersonData {
  through: string;
  earnings: Row[];
  taxes: Row[];
  deductions: Row[];
  employerPaid: Row[];
  fringe: Row[];
  net: number;
}

interface YtdPaychecks {
  Morgan: YtdPersonData;
  Taylor: YtdPersonData;
}

interface MorganYearProjection {
  salary: number;
  raise: number;
  juneTarget: number;
  decTarget: number;
  juneFactor: number;
  decFactor: number;
  otherBonus: number;
  note: string;
}

interface TaylorYearProjection {
  annualSalary: number;
  target: number;
  actual: number | "";
  otherBonus: number;
  note: string;
}

interface WagesProjection {
  Morgan: Record<string, MorganYearProjection>;
  Taylor: Record<string, TaylorYearProjection>;
}

interface WagesBlob {
  ytdPaychecks: YtdPaychecks;
  projection: WagesProjection;
}

function formatCurrency(value: number) {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  return rounded.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string) {
  if (!value) return "";
  const d = new Date(`${value}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
}

function toNum(v: string | number): number {
  const n = Number(typeof v === "string" ? v.replace(/[^0-9.-]/g, "") : v);
  return Number.isNaN(n) ? 0 : n;
}

function cxTab(active: boolean) {
  return `border-b-2 pb-3 ${active ? "border-slate-900 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-800"}`;
}

function SubTabs({ items, active, setActive }: { items: [string, string][]; active: string; setActive: (k: string) => void }) {
  return (
    <div className="mb-5 flex gap-6 border-b border-slate-200 text-sm font-medium">
      {items.map(([key, label]) => (
        <button key={key} onClick={() => setActive(key)} className={cxTab(active === key)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function AmountInput({ value, onChange, width = "w-[110px]" }: { value: number; onChange: (v: number) => void; width?: string }) {
  return (
    <input
      type="text"
      value={formatCurrency(value)}
      onChange={(e) => onChange(toNum(e.target.value))}
      className={`${inputClass} ${width}`}
    />
  );
}

function PercentInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      step="0.1"
      value={(value * 100).toFixed(1)}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      className={`${inputClass} w-[54px]`}
    />
  );
}

function FactorInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min="0"
      max="2"
      step="0.1"
      value={value}
      onChange={(e) => onChange(toNum(e.target.value))}
      className={`${inputClass} w-[54px]`}
    />
  );
}

function OptionalPercentInput({ value, onChange }: { value: number | ""; onChange: (v: number | "") => void }) {
  return (
    <input
      type="number"
      step="0.1"
      value={value === "" ? "" : (Number(value) * 100).toFixed(1)}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value) / 100)}
      className={`${inputClass} w-[54px]`}
    />
  );
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-400">
        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Saving…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600">
        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Saved
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 text-xs text-red-600">
      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      Save failed
      <button onClick={onRetry} className="rounded bg-red-50 px-2 py-0.5 font-medium text-red-700 hover:bg-red-100">
        Retry
      </button>
    </span>
  );
}

function computeMorganProjection(p: MorganYearProjection) {
  const secondRate = p.salary * (1 + p.raise);
  const firstPaid = (p.salary * 166) / 365;
  const secondPaid = (secondRate * 199) / 365;
  const juneBonus = p.salary * p.juneTarget * p.juneFactor;
  const decBonus = secondRate * p.decTarget * p.decFactor;
  const otherBonus = Number(p.otherBonus) || 0;
  return {
    secondRate,
    firstPaid,
    secondPaid,
    salaryPaid: firstPaid + secondPaid,
    juneBonus,
    decBonus,
    bonusPaid: juneBonus + decBonus + otherBonus,
    total: firstPaid + secondPaid + juneBonus + decBonus + otherBonus,
  };
}

function computeTaylorProjection(p: TaylorYearProjection) {
  const usedPct = p.actual === "" ? Number(p.target) || 0 : Number(p.actual) || 0;
  const bonus = (Number(p.annualSalary) || 0) * usedPct;
  const otherBonus = Number(p.otherBonus) || 0;
  return {
    usedPct,
    bonus,
    total: (Number(p.annualSalary) || 0) + bonus + otherBonus,
  };
}

function PaycheckSection({ title, morganRows, taylorRows }: { title: string; morganRows: Row[]; taylorRows: Row[] }) {
  const labels = [...new Set([...morganRows, ...taylorRows].map((r) => r[0]))];
  const amt = (rows: Row[], l: string) => rows.filter((r) => r[0] === l).reduce((s, r) => s + r[1], 0);
  const show = (v: number) => (v ? formatCurrency(v) : "");
  return (
    <div className="mb-6 max-w-3xl">
      <div className={sectionTitle}>{title}</div>
      <div className="border-b border-slate-200">
        {labels.length ? (
          labels.map((l) => {
            const m = amt(morganRows, l);
            const t = amt(taylorRows, l);
            const total = m + t;
            return (
              <div key={l} className="grid grid-cols-[220px_120px_120px_120px] gap-4 py-2 text-sm even:bg-slate-50">
                <div>{l}</div>
                <div className="text-right tabular-nums">{show(m)}</div>
                <div className="text-right tabular-nums">{show(t)}</div>
                <div className="text-right tabular-nums font-medium">{show(total)}</div>
              </div>
            );
          })
        ) : (
          <div className="py-3 text-sm italic text-slate-500">No data entered.</div>
        )}
      </div>
    </div>
  );
}

function YtdPaychecksSubTab({ ytd }: { ytd: YtdPaychecks }) {
  const m = ytd.Morgan;
  const t = ytd.Taylor;
  return (
    <section>
      <div className="mb-6 max-w-3xl border-b border-slate-200">
        <div className="grid grid-cols-[220px_120px_120px_120px] gap-4 border-b border-slate-200 pb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          <div />
          <div className="text-right">Morgan</div>
          <div className="text-right">Taylor</div>
          <div className="text-right">Total</div>
        </div>
        <div className="grid grid-cols-[220px_120px_120px_120px] gap-4 py-2 text-sm">
          <div className={sectionTitle}>Through</div>
          <div className="text-right tabular-nums">{formatDate(m.through)}</div>
          <div className="text-right tabular-nums">{formatDate(t.through)}</div>
          <div />
        </div>
      </div>
      <PaycheckSection title="Earnings" morganRows={m.earnings} taylorRows={t.earnings} />
      <PaycheckSection title="Employee taxes" morganRows={m.taxes} taylorRows={t.taxes} />
      <PaycheckSection title="Deductions" morganRows={m.deductions} taylorRows={t.deductions} />
      <PaycheckSection title="Employer paid benefits" morganRows={m.employerPaid ?? []} taylorRows={t.employerPaid ?? []} />
      <PaycheckSection title="Taxable fringe benefits" morganRows={m.fringe ?? []} taylorRows={t.fringe ?? []} />
      <PaycheckSection title="Net" morganRows={[["Net check", m.net]]} taylorRows={[["Net check", t.net]]} />
    </section>
  );
}

function AnnualProjectionSubTab({
  projection,
  onProjectionChange,
  saveStatus,
  onRetry,
}: {
  projection: WagesProjection;
  onProjectionChange: (p: WagesProjection) => void;
  saveStatus: SaveStatus;
  onRetry: () => void;
}) {
  const [person, setPerson] = useState<Person>("Morgan");
  const [years, setYears] = useState<Record<Person, number>>(() => {
    const y = new Date().getFullYear();
    return { Morgan: y, Taylor: y };
  });

  const year = years[person];
  const yrs = Object.keys(projection[person]).map(Number).sort((a, b) => b - a);

  function set(field: string, value: unknown) {
    const updated: WagesProjection = {
      ...projection,
      [person]: {
        ...projection[person],
        [year]: { ...projection[person][year], [field]: value },
      },
    };
    onProjectionChange(updated);
  }

  const salaryGrid = "grid grid-cols-[120px_130px_80px_70px_120px] gap-4";
  const bonusGrid = "grid grid-cols-[90px_120px_80px_70px_110px_180px] gap-4";

  const moneyCell = (v: number, bold = false) => (
    <div className={`text-right tabular-nums ${bold ? "font-semibold text-slate-900" : "text-slate-900"}`}>{formatCurrency(v)}</div>
  );

  const pct = (value: number, onChange: (v: number) => void) => (
    <div className="flex items-center justify-end gap-1">
      <PercentInput value={value} onChange={onChange} />
      <span className="text-slate-500">%</span>
    </div>
  );

  const optPct = (value: number | "", onChange: (v: number | "") => void) => (
    <div className="flex items-center justify-end gap-1">
      <OptionalPercentInput value={value} onChange={onChange} />
      <span className="text-slate-500">%</span>
    </div>
  );

  const morganData = person === "Morgan" ? (projection.Morgan[year] as MorganYearProjection) : null;
  const taylorData = person === "Taylor" ? (projection.Taylor[year] as TaylorYearProjection) : null;
  const m = morganData ? computeMorganProjection(morganData) : null;
  const t = taylorData ? computeTaylorProjection(taylorData) : null;
  const cur = person === "Morgan" ? morganData : taylorData;

  return (
    <section>
      <div className="mb-5 flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-6 border-b-0 text-sm font-medium">
          {PEOPLE.map((p) => (
            <button key={p} onClick={() => setPerson(p)} className={cxTab(person === p)}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 pb-3">
          <SaveIndicator status={saveStatus} onRetry={onRetry} />
          <div className="text-sm">
            <span className="mr-2 text-slate-500">Year</span>
            <select
              value={year}
              onChange={(e) => setYears((y) => ({ ...y, [person]: Number(e.target.value) }))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5"
            >
              {yrs.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {person === "Morgan" && m && morganData ? (
        <div className="max-w-[760px]">
          <div className="mb-6">
            <div className={sectionTitle}>Salary</div>
            <div className="border-b border-slate-200">
              <div className={`${salaryGrid} border-b border-slate-200 pb-2 text-xs font-medium uppercase tracking-wide text-slate-500`}>
                <div>Period</div>
                <div className="text-right">Salary Rate</div>
                <div className="text-right">Raise</div>
                <div className="text-right">Days</div>
                <div className="text-right">Salary Paid</div>
              </div>
              <div className={`${salaryGrid} py-2 text-sm`}>
                <div>1/1 – 6/15</div>
                <AmountInput value={morganData.salary} onChange={(v) => set("salary", v)} />
                <div className="text-right text-slate-400">—</div>
                <div className="text-right tabular-nums">166</div>
                {moneyCell(m.firstPaid)}
              </div>
              <div className={`${salaryGrid} py-2 text-sm`}>
                <div>6/16 – 12/31</div>
                {moneyCell(m.secondRate)}
                {pct(morganData.raise, (v) => set("raise", v))}
                <div className="text-right tabular-nums">199</div>
                {moneyCell(m.secondPaid)}
              </div>
              <div className={`${salaryGrid} border-t border-slate-300 py-2 text-sm font-semibold`}>
                <div>Total Salary</div>
                <div />
                <div />
                <div className="text-right tabular-nums">365</div>
                {moneyCell(m.salaryPaid, true)}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className={sectionTitle}>Bonus</div>
            <div className="border-b border-slate-200">
              <div className={`${bonusGrid} border-b border-slate-200 pb-2 text-xs font-medium uppercase tracking-wide text-slate-500`}>
                <div>Date</div>
                <div className="text-right">Salary Base</div>
                <div className="text-right">Target</div>
                <div className="text-right">Factor</div>
                <div className="text-right">Bonus</div>
                <div>Note</div>
              </div>
              <div className={`${bonusGrid} py-2 text-sm`}>
                <div>6/15</div>
                {moneyCell(morganData.salary)}
                {pct(morganData.juneTarget, (v) => set("juneTarget", v))}
                <FactorInput value={morganData.juneFactor} onChange={(v) => set("juneFactor", v)} />
                {moneyCell(m.juneBonus)}
                <div />
              </div>
              <div className={`${bonusGrid} py-2 text-sm`}>
                <div>12/15</div>
                {moneyCell(m.secondRate)}
                {pct(morganData.decTarget, (v) => set("decTarget", v))}
                <FactorInput value={morganData.decFactor} onChange={(v) => set("decFactor", v)} />
                {moneyCell(m.decBonus)}
                <div />
              </div>
              <div className={`${bonusGrid} py-2 text-sm`}>
                <div>Other</div>
                <div />
                <div />
                <div />
                <AmountInput value={Number(morganData.otherBonus) || 0} onChange={(v) => set("otherBonus", v)} />
                <input value={morganData.note} onChange={(e) => set("note", e.target.value)} className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm" />
              </div>
              <div className={`${bonusGrid} border-t border-slate-300 py-2 text-sm font-semibold`}>
                <div>Total Bonus</div>
                <div />
                <div />
                <div />
                {moneyCell(m.bonusPaid, true)}
                <div />
              </div>
              <div className={`${bonusGrid} border-y border-slate-400 bg-slate-50 py-3 text-sm font-semibold`}>
                <div>Total Wages</div>
                <div />
                <div />
                <div />
                {moneyCell(m.total, true)}
                <div />
              </div>
            </div>
          </div>
        </div>
      ) : person === "Taylor" && t && taylorData ? (
        <div className="max-w-[760px]">
          <div className="mb-6">
            <div className={sectionTitle}>Salary</div>
            <div className="border-b border-slate-200">
              <div className={`${salaryGrid} border-b border-slate-200 pb-2 text-xs font-medium uppercase tracking-wide text-slate-500`}>
                <div>Period</div>
                <div className="text-right">Salary Rate</div>
                <div />
                <div />
                <div className="text-right">Salary Paid</div>
              </div>
              <div className={`${salaryGrid} py-2 text-sm`}>
                <div>Full year</div>
                <AmountInput value={taylorData.annualSalary} onChange={(v) => set("annualSalary", v)} />
                <div />
                <div />
                <div className="text-right tabular-nums text-slate-900">{formatCurrency(taylorData.annualSalary)}</div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className={sectionTitle}>Bonus</div>
            <div className="border-b border-slate-200">
              <div className={`${bonusGrid} border-b border-slate-200 pb-2 text-xs font-medium uppercase tracking-wide text-slate-500`}>
                <div>Date</div>
                <div className="text-right">Salary Base</div>
                <div className="text-right">Target</div>
                <div className="text-right">Actual</div>
                <div className="text-right">Bonus</div>
                <div>Note</div>
              </div>
              <div className={`${bonusGrid} py-2 text-sm`}>
                <div>12/15</div>
                {moneyCell(taylorData.annualSalary)}
                {pct(taylorData.target, (v) => set("target", v))}
                {optPct(taylorData.actual, (v) => set("actual", v))}
                {moneyCell(t.bonus)}
                <div />
              </div>
              <div className={`${bonusGrid} py-2 text-sm`}>
                <div>Other</div>
                <div />
                <div />
                <div />
                <AmountInput value={Number(taylorData.otherBonus) || 0} onChange={(v) => set("otherBonus", v)} />
                <input value={taylorData.note} onChange={(e) => set("note", e.target.value)} className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm" />
              </div>
              <div className={`${bonusGrid} border-t border-slate-300 py-2 text-sm font-semibold`}>
                <div>Total Bonus</div>
                <div />
                <div />
                <div />
                {moneyCell(t.bonus + (Number(taylorData.otherBonus) || 0), true)}
                <div />
              </div>
              <div className={`${bonusGrid} border-y border-slate-400 bg-slate-50 py-3 text-sm font-semibold`}>
                <div>Total Wages</div>
                <div />
                <div />
                <div />
                {moneyCell(t.total, true)}
                <div />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {cur && <div className="mt-2 h-5" />}
    </section>
  );
}

const fakeWagesBlob: WagesBlob = {
  ytdPaychecks: {
    Morgan: {
      through: "2026-04-30",
      earnings: [
        ["Regular", 54280.76],
        ["Individual Bonus", 12740.25],
      ],
      taxes: [
        ["Federal W/H", 23104.55],
        ["Medicare", 971.08],
        ["Social Security", 4155.3],
        ["State W/H", 2290.5],
      ],
      deductions: [
        ["401k Employee", 8410.0],
        ["401k Loan Repay", 4388.84],
      ],
      employerPaid: [["401k Match", 2661.25]],
      fringe: [],
      net: 23719.49,
    },
    Taylor: {
      through: "2026-05-11",
      earnings: [["Regular", 46790.22]],
      taxes: [
        ["Federal W/H", 4212.6],
        ["Medicare", 581.04],
        ["Social Security", 2497.94],
        ["State W/H", 1285.8],
      ],
      deductions: [
        ["401k Employee", 7040.64],
        ["FSA Dependent Care", 1775.2],
        ["HSA Family", 3025.5],
        ["Medical", 1910.4],
        ["Dental", 230.1],
        ["Charity", 450.0],
        ["Supplemental Life", 171.3],
        ["Spouse Life", 85.4],
      ],
      employerPaid: [
        ["Employer Benefits", 10042.7],
        ["401k Match", 2364.44],
      ],
      fringe: [
        ["Excess Life Imputed", 27.1],
        ["LTD Imputed", 174.6],
      ],
      net: 23991.34,
    },
  },
  projection: {
    Morgan: {
      2026: { salary: 161500, raise: 0.03, juneTarget: 0.06, decTarget: 0.06, juneFactor: 1, decFactor: 1, otherBonus: 0, note: "" },
      2025: { salary: 156750, raise: 0.03, juneTarget: 0.06, decTarget: 0.06, juneFactor: 1, decFactor: 0.95, otherBonus: 2500, note: "Special project" },
    },
    Taylor: {
      2026: { annualSalary: 122500, target: 0.15, actual: "", otherBonus: 0, note: "" },
      2025: { annualSalary: 118000, target: 0.15, actual: 0.16, otherBonus: 1200, note: "Retention bump" },
    },
  },
};


type MemorySubTab = "chat" | "database" | "markdown" | "settings";
type MemoryTable = "identity" | "preferences" | "projects" | "people" | "rules";
type MemoryImportance = "Core" | "Useful" | "Archive";

interface MemoryNote {
  id: string;
  table: MemoryTable;
  title: string;
  body: string;
  tags: string[];
  importance: MemoryImportance;
  updatedAt: string;
}

interface MemoryRelation {
  from: string;
  to: string;
  type: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface MemoryWorkspace {
  notes: MemoryNote[];
  relations: MemoryRelation[];
  messages: ChatMessage[];
}

const tableLabels: Record<MemoryTable, string> = {
  identity: "Identity",
  preferences: "Preferences",
  projects: "Projects",
  people: "People",
  rules: "AI Rules",
};

const memorySeed: MemoryWorkspace = {
  notes: [
    {
      id: "identity-owner",
      table: "identity",
      title: "Owner profile",
      body: "I want a portable, personalized AI memory product that I can understand without needing to code.",
      tags: ["owner", "portable", "plain-english"],
      importance: "Core",
      updatedAt: "2026-05-14",
    },
    {
      id: "preference-teaching-style",
      table: "preferences",
      title: "Teaching style",
      body: "Explain technical topics like I am brand new. Use direct language, examples, and avoid unexplained jargon.",
      tags: ["communication", "beginner-friendly"],
      importance: "Core",
      updatedAt: "2026-05-14",
    },
    {
      id: "project-memory-product",
      table: "projects",
      title: "Portable memory product",
      body: "Build an AI memory cockpit with chat, relational memory tables, markdown files, exportable context, and safety controls.",
      tags: ["memory", "chatbot", "product"],
      importance: "Core",
      updatedAt: "2026-05-14",
    },
    {
      id: "rule-storage",
      table: "rules",
      title: "Storage rule",
      body: "Keep memory readable as markdown first, with IDs and relationships so it can be moved between tools later.",
      tags: ["markdown", "database"],
      importance: "Useful",
      updatedAt: "2026-05-14",
    },
  ],
  relations: [
    { from: "identity-owner", to: "preference-teaching-style", type: "communicates_with" },
    { from: "project-memory-product", to: "rule-storage", type: "uses" },
  ],
  messages: [
    {
      role: "assistant",
      content:
        "Welcome to your Memory Management cockpit. I am a simulated chatbot here: I do not call an AI API yet, but I can show exactly what memory would be packed into an AI prompt.",
    },
  ],
};

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "memory";
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function memoryPath(note: MemoryNote) {
  return `/memory/${note.table}/${note.id}.md`;
}

function noteToMarkdown(note: MemoryNote) {
  return `---\nid: ${note.id}\ntable: ${note.table}\ntitle: ${note.title}\nimportance: ${note.importance}\ntags: [${note.tags.join(", ")}]\nupdated_at: ${note.updatedAt}\n---\n\n# ${note.title}\n\n${note.body}\n`;
}

function workspaceToMarkdown(workspace: MemoryWorkspace) {
  const files = workspace.notes.map((note) => `## ${memoryPath(note)}\n\n\`\`\`md\n${noteToMarkdown(note)}\`\`\``).join("\n\n");
  const relations = workspace.relations.map((rel) => `- ${rel.from} --${rel.type}--> ${rel.to}`).join("\n") || "- No relationships yet.";
  return `# Portable AI Memory Export\n\nThis is the human-readable bundle you can copy into a folder, another app, or a future database.\n\n## Simulated relational links\n\n${relations}\n\n${files}`;
}

function buildMemoryContext(workspace: MemoryWorkspace) {
  return workspace.notes
    .filter((note) => note.importance !== "Archive")
    .map((note) => `- [${tableLabels[note.table]}:${note.importance}] ${note.title}: ${note.body}`)
    .join("\n");
}

function MemoryManagementTab() {
  const [subTab, setSubTab] = useState<MemorySubTab>("chat");
  const [workspace, setWorkspace] = useState<MemoryWorkspace>(memorySeed);
  const [draftMessage, setDraftMessage] = useState("How should I organize my AI memory?");
  const [newTitle, setNewTitle] = useState("New memory");
  const [newTable, setNewTable] = useState<MemoryTable>("projects");
  const [newBody, setNewBody] = useState("Write one useful fact the AI should remember here.");
  const [newTags, setNewTags] = useState("inbox, review");
  const [selectedId, setSelectedId] = useState(memorySeed.notes[0].id);
  const selected = workspace.notes.find((note) => note.id === selectedId) ?? workspace.notes[0];
  const markdownExport = useMemo(() => workspaceToMarkdown(workspace), [workspace]);
  const contextPack = useMemo(() => buildMemoryContext(workspace), [workspace]);
  const coreCount = workspace.notes.filter((note) => note.importance === "Core").length;

  function addMemory() {
    const idBase = `${newTable}-${slugify(newTitle)}`;
    const id = workspace.notes.some((note) => note.id === idBase) ? `${idBase}-${workspace.notes.length + 1}` : idBase;
    const note: MemoryNote = {
      id,
      table: newTable,
      title: newTitle || "Untitled memory",
      body: newBody || "Empty memory body.",
      tags: parseTags(newTags),
      importance: "Useful",
      updatedAt: todayStamp(),
    };
    setWorkspace((current) => ({ ...current, notes: [note, ...current.notes] }));
    setSelectedId(id);
    setNewTitle("New memory");
    setNewBody("Write one useful fact the AI should remember here.");
  }

  function updateSelected(field: keyof MemoryNote, value: string | string[]) {
    setWorkspace((current) => ({
      ...current,
      notes: current.notes.map((note) => (note.id === selected.id ? { ...note, [field]: value, updatedAt: todayStamp() } : note)),
    }));
  }

  function sendMessage() {
    const clean = draftMessage.trim();
    if (!clean) return;
    const answer = `I found ${workspace.notes.length} memories (${coreCount} core). For this turn, I would load the strongest markdown memories first, then answer using this context:\n\n${contextPack}\n\nBeginner translation: your memories are just little note cards. The “database” part is the table, ID, tags, and links that help an AI find the right cards fast.`;
    setWorkspace((current) => ({
      ...current,
      messages: [...current.messages, { role: "user", content: clean }, { role: "assistant", content: answer }],
    }));
    setDraftMessage("");
  }

  const tableCounts = (Object.keys(tableLabels) as MemoryTable[]).map((table) => ({
    table,
    count: workspace.notes.filter((note) => note.table === table).length,
  }));

  return (
    <section>
      <div className="mb-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white shadow-sm">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">Portable AI Memory Product</div>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Memory Management</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
              Think of this as your AI's backpack: markdown files for readability, database-style tables for structure, and a chat simulator that shows what gets remembered on each turn.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-2xl bg-white/10 p-3"><div className="text-2xl font-semibold">{workspace.notes.length}</div><div className="text-slate-300">memories</div></div>
            <div className="rounded-2xl bg-white/10 p-3"><div className="text-2xl font-semibold">{workspace.relations.length}</div><div className="text-slate-300">links</div></div>
            <div className="rounded-2xl bg-white/10 p-3"><div className="text-2xl font-semibold">MD</div><div className="text-slate-300">portable</div></div>
          </div>
        </div>
      </div>

      <SubTabs
        items={[
          ["chat", "AI Chatbot"],
          ["database", "Memory Database"],
          ["markdown", "Markdown Vault"],
          ["settings", "System Design"],
        ]}
        active={subTab}
        setActive={(k) => setSubTab(k as MemorySubTab)}
      />

      {subTab === "chat" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Ultimate-turn chatbot simulator</h2>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">No API key needed</span>
            </div>
            <div className="mb-4 max-h-[460px] space-y-3 overflow-auto rounded-2xl bg-slate-50 p-3">
              {workspace.messages.map((message, index) => (
                <div key={index} className={`rounded-2xl p-3 text-sm leading-6 ${message.role === "user" ? "ml-10 bg-slate-900 text-white" : "mr-10 border border-slate-200 bg-white text-slate-700"}`}>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">{message.role === "user" ? "You" : "Memory AI"}</div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={draftMessage} onChange={(e) => setDraftMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Ask your memory-aware AI..." />
              <button onClick={sendMessage} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Send</button>
            </div>
          </div>
          <aside className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
            <div className={sectionTitle}>Context loaded this turn</div>
            <pre className="max-h-[520px] whitespace-pre-wrap rounded-xl bg-white p-3 text-xs leading-5 text-slate-700">{contextPack}</pre>
          </aside>
        </div>
      )}

      {subTab === "database" && (
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <div className="space-y-3">
            {tableCounts.map(({ table, count }) => (
              <div key={table} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold">{tableLabels[table]}</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{count}</div>
                <div className="text-xs text-slate-500">rows in table</div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_160px]">
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <select value={newTable} onChange={(e) => setNewTable(e.target.value as MemoryTable)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {(Object.keys(tableLabels) as MemoryTable[]).map((table) => <option key={table} value={table}>{tableLabels[table]}</option>)}
              </select>
              <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} className="min-h-[88px] rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
              <input value={newTags} onChange={(e) => setNewTags(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="comma, separated, tags" />
              <button onClick={addMemory} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Add memory row</button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[120px_1fr_110px_130px] bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <div>Table</div><div>Title</div><div>Importance</div><div>Updated</div>
              </div>
              {workspace.notes.map((note) => (
                <button key={note.id} onClick={() => setSelectedId(note.id)} className={`grid w-full grid-cols-[120px_1fr_110px_130px] px-3 py-3 text-left text-sm hover:bg-slate-50 ${note.id === selected.id ? "bg-cyan-50" : "bg-white"}`}>
                  <div className="font-medium text-slate-600">{tableLabels[note.table]}</div>
                  <div><div className="font-medium text-slate-900">{note.title}</div><div className="text-xs text-slate-500">{note.id}</div></div>
                  <div>{note.importance}</div>
                  <div className="text-slate-500">{note.updatedAt}</div>
                </button>
              ))}
            </div>
            {selected && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className={sectionTitle}>Edit selected memory</div>
                <input value={selected.title} onChange={(e) => updateSelected("title", e.target.value)} className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <textarea value={selected.body} onChange={(e) => updateSelected("body", e.target.value)} className="mb-2 min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <div className="grid gap-2 md:grid-cols-2">
                  <select value={selected.importance} onChange={(e) => updateSelected("importance", e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    {(["Core", "Useful", "Archive"] as MemoryImportance[]).map((level) => <option key={level}>{level}</option>)}
                  </select>
                  <input value={selected.tags.join(", ")} onChange={(e) => updateSelected("tags", parseTags(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === "markdown" && (
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className={sectionTitle}>Markdown files</div>
            <div className="space-y-2">
              {workspace.notes.map((note) => (
                <button key={note.id} onClick={() => setSelectedId(note.id)} className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${note.id === selected.id ? "border-cyan-300 bg-cyan-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                  <div className="font-medium">{note.title}</div>
                  <div className="text-xs text-slate-500">{memoryPath(note)}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">{selected ? memoryPath(selected) : "Export"}</div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Copy-ready markdown</span>
            </div>
            <pre className="max-h-[620px] overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-4 text-xs leading-5">{selected ? noteToMarkdown(selected) : markdownExport}</pre>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold">Full portable export bundle</summary>
              <pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-4 text-xs leading-5">{markdownExport}</pre>
            </details>
          </div>
        </div>
      )}

      {subTab === "settings" && (
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["1. Capture", "Write memories as small markdown cards. One fact, preference, project, or rule per card."],
            ["2. Structure", "Each card gets a table, stable ID, tags, importance level, and updated date. That is the simulated relational database."],
            ["3. Retrieve", "Before each chat turn, load only the useful cards. Core memories come first. Archived memories stay out of the way."],
            ["4. Export", "Because everything is markdown, you can copy it to a folder, Git repo, notes app, or future real database."],
            ["5. Safety", "Private or outdated facts can be edited, downgraded to Archive, or removed before they affect future chats."],
            ["6. Upgrade path", "Later, an API-backed chatbot can replace the simulator while keeping the same memory files and tables."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-2 font-semibold">{title}</div>
              <p className="text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function WagesTab() {
  const [projection, setProjection] = useState<WagesProjection>(fakeWagesBlob.projection);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [subTab, setSubTab] = useState<"ytd" | "proj">("ytd");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const queueSave = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSaveStatus("saving");
    debounceTimerRef.current = setTimeout(() => {
      setSaveStatus("saved");
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 1400);
    }, 550);
  }, []);

  function handleProjectionChange(next: WagesProjection) {
    setProjection(next);
    queueSave();
  }

  return (
    <>
      <SubTabs
        items={[
          ["ytd", "YTD Paychecks"],
          ["proj", "Annual Projection"],
        ]}
        active={subTab}
        setActive={(k) => setSubTab(k as "ytd" | "proj")}
      />
      {subTab === "ytd" ? (
        <YtdPaychecksSubTab ytd={fakeWagesBlob.ytdPaychecks} />
      ) : (
        <AnnualProjectionSubTab projection={projection} onProjectionChange={handleProjectionChange} saveStatus={saveStatus} onRetry={queueSave} />
      )}
    </>
  );
}

function tabClass(tab: string, activeTab: string) {
  const enabled = tab === "wages" || tab === "memory";
  if (!enabled) return "border-transparent text-slate-400 cursor-not-allowed";
  return activeTab === tab ? "border-slate-900 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-800";
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [activeTab, setActiveTab] = useState("memory");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const tabs = [
    ["netWorth", "Net Worth"],
    ["businessValuation", "Business"],
    ["loans", "Loans"],
    ["contributions", "Contributions"],
    ["wages", "Wages"],
    ["memory", "Memory Management"],
    ["tax", "Tax"],
    ["files", "Files"],
    ["import", "Import"],
  ];

  return (
    <div className="min-h-screen bg-white p-6 text-slate-950">
      <main className="mx-auto max-w-6xl">
        <header className="mb-6 border-b border-slate-200 pb-4">
          <div className="mb-5 flex items-center gap-6 border-b border-slate-200 text-sm font-medium">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                disabled={key !== "wages" && key !== "memory"}
                onClick={() => (key === "wages" || key === "memory") && setActiveTab(key)}
                className={`border-b-2 pb-3 ${tabClass(key, activeTab)}`}
                title={key === "wages" || key === "memory" ? "Open tab" : "Visible shell only"}
              >
                {label}
              </button>
            ))}

            <div ref={menuRef} className="relative ml-auto mb-3">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Settings"
              >
                ⋮
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-20 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <label className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    Show source
                    <input type="checkbox" checked={showSource} onChange={(e) => setShowSource(e.target.checked)} className="h-4 w-4" />
                  </label>
                </div>
              )}
            </div>
          </div>
        </header>

        {activeTab === "memory" ? <MemoryManagementTab /> : <WagesTab />}

        {showSource && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            Source overlay is hardcoded for the standalone prototype. No external tabs or API calls are active.
          </div>
        )}
      </main>
    </div>
  );
}
