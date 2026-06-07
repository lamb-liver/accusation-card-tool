import { useCallback, useEffect, useState } from 'react';

/**
 * @typedef {'home' | 'deck' | 'share' | 'deck-detail' | 'guestbook' | 'qa' | 'admin'} HashRouteKind
 * @typedef {{ kind: HashRouteKind, shareId?: string }} HashRoute
 */

/** @param {string} hash @returns {HashRoute} */
export function parseHashRoute(hash = window.location.hash) {
  const raw = hash.replace(/^#\/?/, '').trim();
  if (!raw) return { kind: 'home' };
  const parts = raw.split('/').filter(Boolean);
  if (parts[0] === 'deck') return { kind: 'deck' };
  if (parts[0] === 'decks' && parts[1]) return { kind: 'deck-detail', shareId: decodeURIComponent(parts[1]) };
  if (parts[0] === 'decks') return { kind: 'share' };
  if (parts[0] === 'guestbook') return { kind: 'guestbook' };
  if (parts[0] === 'qa') return { kind: 'qa' };
  if (parts[0] === 'admin') return { kind: 'admin' };
  return { kind: 'home' };
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHashRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(parseHashRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((path) => {
    const next = path ? `#/${path.replace(/^\//, '')}` : '';
    if (window.location.hash !== next) {
      window.location.hash = next;
      setRoute(parseHashRoute(next));
    } else {
      setRoute(parseHashRoute());
    }
  }, []);

  return { route, navigate };
}
