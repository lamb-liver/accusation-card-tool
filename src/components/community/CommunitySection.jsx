import { useEffect, useState } from 'react';
import GuestbookSection from '../guestbook/GuestbookSection.jsx';
import ShareWallSection from '../shareWall/ShareWallSection.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import {
  restoreCommunityScroll,
  scrollToCommunitySection,
} from '../../utils/communityScroll.js';

/**
 * 留言區 mount 後延遲載入牌組，僅錯開兩段 loading 視覺，不等待留言 API 完成。
 * 與 API 延遲無關；留言慢時牌組仍會並行載入。
 */
const DECKS_STAGGER_MS = 150;

/**
 * @param {{ showToast: Function, onOpenDeck: (shareId: string) => void, initialSection?: 'guestbook' | 'decks' }} props
 */
export default function CommunitySection({ showToast, onOpenDeck, initialSection }) {
  usePageTitle('控訴 - 交流區');

  const [decksLoadEnabled, setDecksLoadEnabled] = useState(false);

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

  useEffect(() => {
    const timer = window.setTimeout(() => setDecksLoadEnabled(true), DECKS_STAGGER_MS);
    return () => window.clearTimeout(timer);
  }, []);

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
          href="#community-guestbook"
          className="rounded-md border border-[#555] px-3 py-1.5 text-sm font-semibold text-gray-200 transition hover:border-brand-gold hover:text-brand-gold"
        >
          留言板
        </a>
        <a
          href="#community-decks"
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
          <ShareWallSection
            embedded
            loadEnabled={decksLoadEnabled}
            onOpenDeck={onOpenDeck}
          />
        </div>
      </div>
    </div>
  );
}
