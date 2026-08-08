#!/usr/bin/env node
import { readFileSync } from 'node:fs';

import { MECHANIC_GLOSSARY } from '../src/constants/mechanicGlossary.js';
import { parseQaModule } from './lib/qa-module.mjs';

const cards = JSON.parse(readFileSync(new URL('../public/cards.json', import.meta.url), 'utf8'));
const qaSource = readFileSync(new URL('../src/data/qaData.js', import.meta.url), 'utf8');
const qaData = parseQaModule(qaSource);

if (!Array.isArray(qaData)) {
  throw new Error('check-content: 無法解析 src/data/qaData.js');
}

const suspicious = [
  ['template placeholder', /\{\{[^{}]+\}\}/],
  ['TODO', /\bTODO\b/i],
  ['FIXME', /\bFIXME\b/i],
  ['undefined', /\bundefined\b/i],
  ['null', /\bnull\b/i],
  ['NaN', /\bNaN\b/i],
  ['object stringification', /\[object Object\]/i],
  ['unmatched import message', /未能自動/],
  ['parse failure message', /解析失敗/],
];

const failures = [];

function scan(value, path) {
  if (value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))) {
    failures.push(`${path}: invalid value (${String(value)})`);
    return;
  }
  if (typeof value === 'string') {
    for (const [label, pattern] of suspicious) {
      if (pattern.test(value)) failures.push(`${path}: ${label} (${JSON.stringify(value)})`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scan(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) scan(item, `${path}.${key}`);
  }
}

scan(cards, 'cards');
scan(qaData, 'qaData');
scan(MECHANIC_GLOSSARY, 'mechanicGlossary');

if (failures.length > 0) {
  console.error('check-content: failed');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`check-content: ok (${cards.length} cards, ${qaData.length} QA categories)`);
