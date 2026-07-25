import { APP_BACKGROUND_IMAGE } from '../constants/appBackground.js';

export default function AppPageBackground() {
  return (
    <div
      className="app-page-background"
      aria-hidden
      style={{ '--app-background-image': `url('${APP_BACKGROUND_IMAGE}')` }}
    />
  );
}
