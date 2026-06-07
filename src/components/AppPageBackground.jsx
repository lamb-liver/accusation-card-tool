import { APP_BACKGROUND_IMAGE } from '../constants/appBackground.js';

const MODES = ['gallery', 'deck', 'share', 'guestbook', 'qa', 'admin'];

/**
 * 三個模式各一層背景，圖片相同（背景.webp）。
 * @param {{ activeMode: string }} props
 */
export default function AppPageBackground({ activeMode }) {
  return (
    <>
      {MODES.map((mode) => (
        <div
          key={mode}
          className="app-page-background"
          data-mode={mode}
          hidden={activeMode !== mode}
          aria-hidden
          style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('${APP_BACKGROUND_IMAGE}')` }}
        />
      ))}
    </>
  );
}
