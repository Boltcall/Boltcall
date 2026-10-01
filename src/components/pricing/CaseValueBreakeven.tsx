import React, { useId, useState } from 'react';

// Pure arithmetic, no forecast: how many extra signed cases cover each plan at the firm's own case value.
// Prices are the canonical monthly prices (see src/components/Pricing.tsx).
const PLANS = [
  { name: 'Starter', price: 549 },
  { name: 'Pro', price: 897 },
  { name: 'Ultimate', price: 4997 },
];

const DEFAULT_VALUE = 2500;

function breakEven(price: number, caseValue: number): string {
  if (!caseValue || caseValue <= 0) return 'Enter a case value';
  const ratio = price / caseValue;
  if (ratio <= 1) return `1 extra signed case every ${(1 / ratio).toFixed(1)} months`;
  return `${ratio.toFixed(1)} extra signed cases per month`;
}

const CaseValueBreakeven: React.FC = () => {
  const [value, setValue] = useState<number>(DEFAULT_VALUE);
  const inputId = useId();

  return (
    <div id="breakeven" className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <label htmlFor={inputId} className="block text-sm font-semibold text-gray-900">
        Your average fee per signed case
      </label>
      <div className="mt-2 flex max-w-xs items-center rounded-lg border border-gray-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
        <span className="text-gray-500" aria-hidden="true">$</span>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={0}
          step={100}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => setValue(e.target.value === '' ? 0 : Number(e.target.value))}
          className="w-full bg-transparent px-2 py-2.5 text-base text-gray-900 focus:outline-none"
        />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-gray-500">
              <th scope="col" className="pb-2 font-semibold">Plan</th>
              <th scope="col" className="pb-2 font-semibold">Monthly price</th>
              <th scope="col" className="pb-2 font-semibold">Covered by</th>
            </tr>
          </thead>
          <tbody aria-live="polite">
            {PLANS.map((plan) => (
              <tr key={plan.name} className="border-t border-gray-100">
                <th scope="row" className="py-3 font-semibold text-gray-900">{plan.name}</th>
                <td className="py-3 text-gray-700">${plan.price.toLocaleString()}</td>
                <td className="py-3 font-medium text-gray-900">{breakEven(plan.price, value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs leading-5 text-gray-500">
        Arithmetic, not a forecast. $2,500 is a placeholder; use your own average fee. Boltcall cannot
        promise how many extra cases you will sign.
      </p>
    </div>
  );
};

export default CaseValueBreakeven;
