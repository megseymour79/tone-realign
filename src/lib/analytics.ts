type AnalyticsProps = Record<string, string | number | boolean>;
type PlausibleOptions = { props?: AnalyticsProps; u?: string };
type PlausibleFn = {
  (eventName: string, options?: PlausibleOptions): void;
  q?: Array<[string, PlausibleOptions?]>;
};

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
const PLAUSIBLE_API_HOST =
  (import.meta.env.VITE_PLAUSIBLE_API_HOST || "https://plausible.io").replace(
    /\/$/,
    "",
  );

export function initAnalytics() {
  if (!PLAUSIBLE_DOMAIN || typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (!window.plausible) {
    const queue: PlausibleFn = (eventName: string, options?: PlausibleOptions) => {
      queue.q = queue.q || [];
      queue.q.push([eventName, options]);
    };

    window.plausible = queue;
  }

  if (document.querySelector('script[data-analytics="plausible"]')) {
    return;
  }

  const script = document.createElement("script");
  script.defer = true;
  script.dataset.analytics = "plausible";
  script.dataset.domain = PLAUSIBLE_DOMAIN;
  script.dataset.api = `${PLAUSIBLE_API_HOST}/api/event`;
  script.src = `${PLAUSIBLE_API_HOST}/js/script.js`;
  document.head.appendChild(script);
}

export function trackPageview(pathname: string) {
  if (!PLAUSIBLE_DOMAIN || typeof window === "undefined" || !window.plausible) {
    return;
  }

  window.plausible("pageview", {
    u: new URL(pathname, window.location.origin).toString(),
  });
}

export function trackEvent(eventName: string, props?: AnalyticsProps) {
  if (!PLAUSIBLE_DOMAIN || typeof window === "undefined" || !window.plausible) {
    return;
  }

  window.plausible(eventName, props ? { props } : undefined);
}
