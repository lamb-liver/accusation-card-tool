import { onCLS, onINP, onLCP } from 'web-vitals';

function logMetric({ name, value, rating }) {
  if (import.meta.env.DEV) {
    console.info(`[web-vitals] ${name}`, { value: Math.round(value), rating });
  }
}

/** 收集 LCP / INP / CLS，開發環境輸出至 console */
export function reportWebVitals() {
  onLCP(logMetric);
  onINP(logMetric);
  onCLS(logMetric);
}
