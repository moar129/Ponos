import type { ToggleSwitchProps } from '../../types/common/toggleSwitchType';

// Tænd/sluk-kontakt (role="switch"). Delt af Opret opgave (kræver
// godkendelse) og notifikationsindstillingerne på /bruger.
export function ToggleSwitch({ checked, onChange, disabled = false, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-500'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
