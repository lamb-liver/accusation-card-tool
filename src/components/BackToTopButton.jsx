import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * 捲動超過門檻才出現的回頂按鈕。
 * 手機位置在篩選 FAB（bottom-20, h-14）上方；桌面無篩選 FAB，靠右下角。
 */
export default function BackToTopButton({ threshold = 600 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > threshold);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="回到頁首"
      className="fixed bottom-[9.5rem] right-4 z-[890] flex h-11 w-11 items-center justify-center rounded-full border border-brand-gold/60 bg-neutral-900/90 text-brand-gold shadow-lg backdrop-blur transition hover:bg-neutral-800 active:scale-95 md:bottom-6 md:right-6"
    >
      <ArrowUp className="h-5 w-5" aria-hidden strokeWidth={2.5} />
    </button>
  );
}
