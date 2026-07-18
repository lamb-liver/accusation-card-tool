const FACTION_COLORS = {
  '白狐神社': 'border-red-400 bg-red-950/45 text-red-100',
  '鴉教團': 'border-purple-400 bg-purple-950/45 text-purple-100',
  '瘋人院': 'border-pink-400 bg-pink-950/45 text-pink-100',
  '門教團': 'border-blue-400 bg-blue-950/45 text-blue-100',
  '逐光者': 'border-amber-400 bg-amber-950/45 text-amber-100',
  '禁忌廚房': 'border-rose-400 bg-rose-950/45 text-rose-100',
  '放逐者': 'border-neutral-400 bg-neutral-800/90 text-neutral-100',
};

const TYPE_COLORS = {
  '教主': 'border-brand-gold bg-amber-950/45 text-amber-100',
  '儀式': 'border-orange-400 bg-orange-950/45 text-orange-100',
  '信徒': 'border-emerald-400 bg-emerald-950/45 text-emerald-100',
  '魔法': 'border-indigo-400 bg-indigo-950/45 text-indigo-100',
  '地點': 'border-cyan-400 bg-cyan-950/45 text-cyan-100',
};

const LOCATION_TYPE_COLORS = {
  '橋': 'border-amber-500 bg-amber-950/40 text-amber-100',
  '聖地': 'border-violet-400 bg-violet-950/45 text-violet-100',
  '墓園': 'border-stone-500 bg-stone-900/70 text-stone-200',
  '荒野': 'border-lime-500 bg-lime-950/35 text-lime-100',
  '圖書館': 'border-sky-400 bg-sky-950/45 text-sky-100',
  '庭院': 'border-teal-400 bg-teal-950/45 text-teal-100',
};

/** 卡牌 id → 實體卡面編號顯示（cro01 → CRO-01；mot12 → MOT-12） */
export function formatCardNumber(id) {
  const match = /^([a-z]+)(\d+)$/i.exec(id ?? '');
  return match ? `${match[1].toUpperCase()}-${match[2]}` : String(id ?? '').toUpperCase();
}

export function getCardStats(card) {
  const stats = [];
  if (card.type === '儀式') {
    if (card.calamity !== undefined) stats.push({ label: '災厄', value: card.calamity });
  } else if (card.type === '信徒') {
    if (card.volume !== undefined) stats.push({ label: '聲量', value: card.volume });
    if (card.calamity !== undefined) stats.push({ label: '災厄', value: card.calamity });
  } else if (card.type === '地點') {
    if (card.guard !== undefined) stats.push({ label: '守護', value: card.guard });
    if (card.calamity !== undefined && card.calamity !== 0) {
      stats.push({ label: '災厄', value: card.calamity });
    }
  } else if (card.type === '魔法') {
    if (card.stardust !== undefined) stats.push({ label: '星塵', value: card.stardust });
    if (card.calamity !== undefined) stats.push({ label: '災厄', value: card.calamity });
  }
  return stats;
}

export function getCardMetaCells(card) {
  const metaCells = [
    {
      key: 'faction',
      content: card.faction,
      className:
        FACTION_COLORS[card.faction] ||
        'border-neutral-500 bg-neutral-900/85 text-neutral-200',
    },
    {
      key: 'type',
      content: card.type,
      className:
        TYPE_COLORS[card.type] ||
        'border-neutral-500 bg-neutral-900/85 text-neutral-200',
    },
  ];

  if (card.type === '地點') {
    const lt = card.locationType;
    metaCells.push({
      key: 'locationType',
      content: lt || '—',
      className: lt
        ? LOCATION_TYPE_COLORS[lt] ||
          'border-neutral-500 bg-neutral-900/85 text-neutral-200'
        : 'border-neutral-600 bg-neutral-900/70 text-neutral-500',
    });
  }

  return metaCells;
}

export const CARD_STAT_COLORS = {
  聲量: 'text-lime-100 bg-lime-950/55 border-lime-500/65',
  災厄: 'text-orange-100 bg-orange-950/60 border-orange-500/80',
  守護: 'text-sky-100 bg-sky-950/55 border-sky-400/85',
  星塵: 'text-violet-100 bg-violet-950/55 border-violet-400/70',
};
