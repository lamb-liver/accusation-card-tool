import { useMemo } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import FactionStatBar from './FactionStatBar.jsx';
import { buildFactionOptions } from './factionOptions.js';
import { DECK_LIMITS } from '../../deck/deckCompositionRules.js';

const selectClass =
  'native-select w-full rounded-md border bg-[#2a2a2a] py-3 pl-3 pr-3 text-sm leading-snug text-white outline-none transition focus:outline focus:outline-2 focus:outline-brand-gold';

export default function DeckRuleConfigurator({
  currentRule,
  ruleSelect,
  onRuleSelectChange,
  primaryFaction,
  secondaryFaction,
  onSetPrimaryFaction,
  onSetSecondaryFaction,
  onApplyRule,
  onClearDeckOnly,
  onResetRuleAndClear,
  onShowToast,
  primaryCount,
  secondaryCount,
  exileCount,
}) {
  const primaryOptions = useMemo(
    () => buildFactionOptions('── 請選擇主要教團 ──'),
    []
  );

  const secondaryOptions = useMemo(
    () => buildFactionOptions('── 請選擇次要教團 ──', primaryFaction),
    [primaryFaction]
  );

  const handleApplyRule = () => {
    if (!primaryFaction) {
      onShowToast('請先選擇主要教團', 'warning');
      return;
    }
    onApplyRule(ruleSelect, primaryFaction, secondaryFaction);
  };

  return (
    <>
      <div className="deck-rules-setup border-t border-[#444] pt-3">
        <p className="text-brand-gold font-semibold text-sm mb-2">構築規則</p>

        <div className="flex rounded-lg overflow-hidden border border-[#444] mb-3">
          <button
            type="button"
            onClick={() => onRuleSelectChange('rule1')}
            className={`flex-1 py-2.5 px-2 text-xs font-bold transition-all duration-200 leading-tight ${
              ruleSelect === 'rule1'
                ? 'bg-brand-gold text-black'
                : 'bg-[#2a2a2a] text-gray-400 hover:text-gray-200 hover:bg-[#333]'
            }`}
          >
            <span className="block">規則一</span>
            <span
              className={`block text-[10px] font-normal mt-0.5 ${
                ruleSelect === 'rule1' ? 'text-black/60' : 'text-gray-400'
              }`}
            >
              單一教團
            </span>
          </button>
          <div className="w-px bg-[#444]" />
          <button
            type="button"
            onClick={() => onRuleSelectChange('rule2')}
            className={`flex-1 py-2.5 px-2 text-xs font-bold transition-all duration-200 leading-tight ${
              ruleSelect === 'rule2'
                ? 'bg-brand-gold text-black'
                : 'bg-[#2a2a2a] text-gray-400 hover:text-gray-200 hover:bg-[#333]'
            }`}
          >
            <span className="block">規則二</span>
            <span
              className={`block text-[10px] font-normal mt-0.5 ${
                ruleSelect === 'rule2' ? 'text-black/60' : 'text-gray-400'
              }`}
            >
              主＋次教團
            </span>
          </button>
        </div>

        <p className="text-gray-400 text-[11px] mb-3 leading-relaxed bg-[#1e1e1e] rounded px-2.5 py-1.5 border border-[#333]">
          {ruleSelect === 'rule1'
            ? '主牌組限同一教團，搭配中立（放逐者）卡。主牌組上限 20 張。'
            : '主教團最多 12 張，次教團最多 8 張，可搭配中立卡。'}
        </p>

        <p id="primary-faction-label" className="text-[11px] text-gray-400 mb-1 block font-medium">
          主要教團
        </p>
        <div className="mb-2">
          <select
            id="deck-primary-faction"
            value={primaryFaction}
            onChange={(event) => onSetPrimaryFaction(event.target.value)}
            aria-labelledby="primary-faction-label"
            className={selectClass}
          >
            {primaryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div
          className="transition-all duration-300"
          style={{
            maxHeight: ruleSelect === 'rule2' ? '120px' : '0',
            opacity: ruleSelect === 'rule2' ? 1 : 0,
            overflow: ruleSelect === 'rule2' ? 'visible' : 'hidden',
          }}
        >
          <p id="secondary-faction-label" className="text-[11px] text-gray-400 mb-1 block font-medium">
            次要教團
          </p>
          <div className="mb-2">
            <select
              id="deck-secondary-faction"
              value={secondaryFaction}
              onChange={(event) => onSetSecondaryFaction(event.target.value)}
              aria-labelledby="secondary-faction-label"
              className={selectClass}
            >
              {secondaryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentRule.isActive && (
          <div className="flex items-center gap-1.5 rounded-md border border-brand-gold/40 bg-brand-gold/10 px-2.5 py-1.5 mb-2">
            <span className="text-[10px] text-brand-gold/70 font-medium shrink-0">套用中：</span>
            <span className="text-[11px] text-brand-gold font-bold truncate">
              {currentRule.type === 'rule1'
                ? `${currentRule.primary} 單教團`
                : `${currentRule.primary} ＋ ${currentRule.secondary || '未設定次教團'}`}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleApplyRule}
          className="btn-apply-rule w-full bg-brand-gold hover:bg-amber-500 active:brightness-90 text-black font-semibold py-2 px-3 rounded mb-2 transition"
        >
          套用規則並過濾卡池
        </button>

        <div className="button-group flex gap-2">
          <button
            type="button"
            onClick={onClearDeckOnly}
            className="btn-clear-deck-only inline-flex flex-1 items-center justify-center gap-2 bg-[#555] hover:bg-[#666] text-white font-semibold py-2 px-3 rounded transition"
          >
            <Trash2 className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2.25} />
            清空牌組
          </button>
          <button
            type="button"
            onClick={onResetRuleAndClear}
            className="btn-reset-rule inline-flex flex-1 items-center justify-center gap-2 bg-[#6c3483] hover:bg-[#7d4488] text-white font-semibold py-2 px-3 rounded transition"
          >
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2.25} />
            重置規則
          </button>
        </div>
      </div>

      {currentRule.isActive && (
        <div className="stat-container border-t border-[#444] pt-3 text-sm space-y-3">
          <p className="text-brand-gold font-semibold">教團配額進度：</p>

          {/* 刻意以草稿 ruleSelect（而非已套用規則）計算上限：讓使用者在按「套用」前
              預覽切換規則後的配額變化（可能顯示超限紅條，屬預期行為） */}
          <FactionStatBar
            factionName={primaryFaction}
            currentCount={primaryCount}
            maxCount={ruleSelect === 'rule2' ? DECK_LIMITS.rule2PrimaryMain : DECK_LIMITS.maxMain}
          />

          {ruleSelect === 'rule2' && secondaryFaction && (
            <FactionStatBar
              factionName={secondaryFaction}
              currentCount={secondaryCount}
              maxCount={DECK_LIMITS.rule2SecondaryMain}
            />
          )}

          {exileCount > 0 && (
            <FactionStatBar
              factionName="放逐者（中立）"
              currentCount={exileCount}
              maxCount={100}
              isUnlimited
            />
          )}
        </div>
      )}
    </>
  );
}
