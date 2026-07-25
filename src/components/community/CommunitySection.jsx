import { useEffect } from 'react';
import GuestbookSection from '../guestbook/GuestbookSection.jsx';
import ShareWallSection from '../shareWall/ShareWallSection.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import {
  restoreCommunityScroll,
  scrollToCommunitySection,
} from '../../utils/communityScroll.js';

/**
 * @param {{ showToast: Function, onOpenDeck: (shareId: string) => void, initialSection?: 'guestbook' | 'decks' }} props
 */
export default function CommunitySection({ showToast, onOpenDeck, initialSection }) {
  usePageTitle('控訴 - 交流區');

  useEffect(() => {
    restoreCommunityScroll();
  }, []);

  useEffect(() => {
    if (!initialSection) return;
    const timer = window.setTimeout(() => {
      scrollToCommunitySection(initialSection);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialSection]);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-4 text-center">
        <h2 className="text-xl font-bold text-brand-gold">交流區</h2>
        <p className="mt-1 text-sm text-gray-400">留言與公開牌組分享</p>
      </header>

      <nav
        className="community-subnav sticky z-[100] -mx-1 mb-6 flex justify-center gap-2 rounded-lg border border-[#444] bg-neutral-900/95 px-2 py-2 backdrop-blur-sm"
        aria-label="交流區捷徑"
      >
        <a
          href="#/guestbook"
          className="rounded-md border border-[#555] px-3 py-1.5 text-sm font-semibold text-gray-200 transition hover:border-brand-gold hover:text-brand-gold"
        >
          留言板
        </a>
        <a
          href="#/decks"
          className="rounded-md border border-[#555] px-3 py-1.5 text-sm font-semibold text-gray-200 transition hover:border-brand-gold hover:text-brand-gold"
        >
          分享牌組
        </a>
      </nav>

      <div className="space-y-12">
        <div id="community-guestbook" className="scroll-mt-28">
          <GuestbookSection embedded showToast={showToast} />
        </div>

        <div
          id="community-decks"
          className="scroll-mt-28 border-t border-[#444] pt-10"
        >
          <ShareWallSection embedded onOpenDeck={onOpenDeck} />
        </div>
      </div>
    </div>
  );
}
