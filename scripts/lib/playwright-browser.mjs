import { existsSync } from 'node:fs';

const DEFAULT_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export function getChromiumLaunchOptions() {
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    process.env.CHROME_EXECUTABLE_PATH ||
    DEFAULT_CHROME_PATHS.find((candidate) => existsSync(candidate));

  return {
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  };
}
