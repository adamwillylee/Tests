import React, { useCallback, useEffect, useRef, useState } from "react";

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

function tabClass(tab: string) {
  return tab === "wages" ? "border-slate-900 text-slate-950" : "border-transparent text-slate-400 cursor-not-allowed";
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSource, setShowSource] = useState(false);
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
    ["tax", "Tax"],
    ["files", "Files"],
    ["import", "Import"],
  ];

  return (
    <div className="min-h-screen bg-white p-6 text-slate-950">
      <main className="mx-auto max-w-3xl">
        <header className="mb-6 border-b border-slate-200 pb-4">
          <div className="mb-5 flex items-center gap-6 border-b border-slate-200 text-sm font-medium">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                disabled={key !== "wages"}
                className={`border-b-2 pb-3 ${tabClass(key)}`}
                title={key === "wages" ? "Current tab" : "Visible shell only"}
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

        <WagesTab />

        {showSource && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            Source overlay is hardcoded for the standalone prototype. No external tabs or API calls are active.
          </div>
        )}
      </main>
    </div>
  );
}
