export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  // Tilgængeligt navn, når kontakten ikke har en synlig <label>.
  label?: string;
}
