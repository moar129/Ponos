import { useLayoutEffect, useRef, type DependencyList } from 'react';

const MIN_FONT_PX = 11;

// Skalerer et elements skriftstørrelse ned, så indholdet kan stå på én linje
// i stedet for at blive afkortet med "…". Max-størrelsen er elementets egen
// CSS (fx Tailwind-breakpoints), så den følger stadig skærmbredden. Passer
// indholdet ikke selv ved MIN_FONT_PX, må det ombrydes - aldrig afkortes.
//
// Elementet skal have min-w-0 + overflow-hidden + whitespace-nowrap og sidde
// i en flex-forælder, der kan skrumpe; børn skal bruge em-størrelser, så de
// skalerer med. Elementet selv observeres ikke, så tilpasningen ikke
// trigger sig selv i ring.
export function useFitText<T extends HTMLElement>(deps: DependencyList) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      el.style.fontSize = '';
      el.style.whiteSpace = '';
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth && size > MIN_FONT_PX) {
        size = Math.max(MIN_FONT_PX, size - 1);
        el.style.fontSize = `${size}px`;
      }
      if (el.scrollWidth > el.clientWidth) el.style.whiteSpace = 'normal';
    };

    fit();
    // Webfonts kan ændre tekstbredden, når de er færdige med at loade.
    void document.fonts.ready.then(fit);

    // Headeren fanger ændringer i skærmbredden; forælderen fanger at naboerne
    // (fx nav-links, der dukker op når rettigheder er hentet) tager plads.
    const observer = new ResizeObserver(fit);
    const header = el.closest('header');
    if (header) observer.observe(header);
    if (el.parentElement) observer.observe(el.parentElement);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
