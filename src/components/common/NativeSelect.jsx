import { ChevronDown } from 'lucide-react';

const VARIANT_CLASS = {
  toolbar:
    'native-select w-full rounded-md border bg-[#2a2a2a] py-3 pl-3 pr-9 text-base leading-snug text-white outline-none transition focus:outline focus:outline-2 focus:outline-brand-gold',
  drawer:
    'native-select w-full rounded border-2 border-brand-gold bg-neutral-800 px-3 py-2 pr-9 text-sm text-brand-gold outline-none focus:ring-2 focus:ring-brand-gold',
};

export default function NativeSelect({
  id,
  value,
  options = [],
  onChange = () => {},
  ariaLabel,
  labelId,
  variant = 'toolbar',
  className = '',
}) {
  // ponytail: native select intentionally drops option icons; labels are the source of truth.
  return (
    <div className="relative w-full">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        aria-labelledby={labelId}
        className={`${VARIANT_CLASS[variant] ?? VARIANT_CLASS.toolbar} appearance-none ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa]"
        strokeWidth={2.25}
      />
    </div>
  );
}
