/**
 * 效果關鍵字說明：卡面只寫關鍵字（如「聖戰。」），此處補充其完整規則，
 * 於卡片詳情彈窗效果下方顯示。key 需與效果文字中的關鍵字一致。
 */
export const MECHANIC_GLOSSARY = {
  聖戰: '聖戰信徒可以襲擊敵方場上的罪惡信徒。',
  供品: '供品信徒無法控訴、無法襲擊，並且可以被對方信徒襲擊。',
};

/**
 * 回傳卡片效果中出現、且有說明的關鍵字（依 glossary 定義順序）。
 * @param {string | undefined} effect
 * @returns {{ term: string, description: string }[]}
 */
export function getMechanicNotes(effect) {
  if (!effect) return [];
  return Object.entries(MECHANIC_GLOSSARY)
    .filter(([term]) => effect.includes(term))
    .map(([term, description]) => ({ term, description }));
}
