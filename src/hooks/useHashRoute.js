import { useCallback, useEffect, useState } from 'react';

/**
 * @typedef {'home' | 'deck' | 'community' | 'deck-detail' | 'qa' | 'clock' | 'admin'} HashRouteKind
 * @typedef {{ kind: HashRouteKind, shareId?: string, communityScroll?: 'guestbook' | 'decks', qaCategory?: string }} HashRoute
 */

/**
 * 拆出 hash 的 path 與 query 兩段。
 *
 * 路由狀態分兩類，刻意用不同載體：
 * - path（`#/deck`、`#/qa/鴉教團`）＝「在哪個畫面」，切換要推入瀏覽歷史。
 * - query（`?q=…&faction=…&card=cro01`）＝「畫面上的狀態」，逐字輸入時
 *   若推入歷史會讓上一頁鍵變成逐字元倒退，故一律用 replaceState 覆寫。
 *
 * @param {string} hash
 * @returns {{ path: string, query: string }}
 */
function splitHash(hash) {
  const raw = hash.replace(/^#\/?/, '');
  const queryIndex = raw.indexOf('?');
  if (queryIndex < 0) return { path: raw, query: '' };
  return { path: raw.slice(0, queryIndex), query: raw.slice(queryIndex + 1) };
}

/** @param {string} hash @returns {HashRoute} */
export function parseHashRoute(hash = window.location.hash) {
  const raw = splitHash(hash).path.trim();
  if (!raw) return { kind: 'home' };
  const parts = raw.split('/').filter(Boolean);
  if (parts[0] === 'deck') return { kind: 'deck' };
  if (parts[0] === 'decks' && parts[1]) {
    return { kind: 'deck-detail', shareId: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'decks') return { kind: 'community', communityScroll: 'decks' };
  if (parts[0] === 'guestbook') return { kind: 'community', communityScroll: 'guestbook' };
  if (parts[0] === 'community') return { kind: 'community' };
  // 舊版錨點 #community-decks / #community-guestbook（勿與路由混用，會誤判為查卡）
  if (raw === 'community-decks') return { kind: 'community', communityScroll: 'decks' };
  if (raw === 'community-guestbook') return { kind: 'community', communityScroll: 'guestbook' };
  // #/qa/<教團> 可直接開在該教團分類（卡片彈窗的「查看此教團 QA」使用）
  if (parts[0] === 'qa' && parts[1]) {
    return { kind: 'qa', qaCategory: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'qa') return { kind: 'qa' };
  if (parts[0] === 'clock') return { kind: 'clock' };
  if (parts[0] === 'admin') return { kind: 'admin' };
  return { kind: 'home' };
}

/** @param {string} hash @returns {Record<string, string>} */
export function parseHashQuery(hash = window.location.hash) {
  const params = new URLSearchParams(splitHash(hash).query);
  /** @type {Record<string, string>} */
  const result = {};
  for (const [key, value] of params) {
    if (value !== '') result[key] = value;
  }
  return result;
}

/**
 * 由 path 與 query 組回完整 hash。空 query 不留下孤零零的 `?`。
 * @param {string} path
 * @param {Record<string, string>} query
 */
export function buildHash(path, query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  const search = params.toString();
  const normalizedPath = path.replace(/^\//, '');
  const base = normalizedPath ? `#/${normalizedPath}` : '#/';
  return search ? `${base}?${search}` : base;
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHashRoute());
  const [query, setQueryState] = useState(() => parseHashQuery());

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashRoute());
      setQueryState(parseHashQuery());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  /** 切換畫面：推入歷史，並清掉上一個畫面的 query（篩選不該跟著跨頁殘留） */
  const navigate = useCallback((path) => {
    const next = path ? `#/${path.replace(/^\//, '')}` : '';
    if (window.location.hash !== next) {
      window.location.hash = next;
      setRoute(parseHashRoute(next));
      setQueryState(parseHashQuery(next));
    } else {
      setRoute(parseHashRoute());
      setQueryState(parseHashQuery());
    }
  }, []);

  /**
   * 覆寫目前畫面的 query。
   *
   * 用 replaceState 而非寫 location.hash：後者每次都推一筆歷史，逐字輸入搜尋
   * 會塞爆上一頁；replaceState 也不觸發 hashchange，因此不會回頭再觸發一次
   * 本 hook 的 listener 而形成迴圈。
   *
   * @param {Record<string, string>} nextQuery 完整取代，不與現有 query 合併
   */
  const setQuery = useCallback((nextQuery) => {
    const path = splitHash(window.location.hash).path;
    const nextHash = buildHash(path, nextQuery);
    // '' 與 '#/' 都是首頁：首次載入裸網址時空 query 會組出 '#/'，
    // 若不視為相等就會無故 replaceState、把乾淨的網址改寫成「site/#/」
    const currentHash = window.location.hash || '#/';
    if (currentHash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
    setQueryState(parseHashQuery(nextHash));
  }, []);

  return { route, query, navigate, setQuery };
}
