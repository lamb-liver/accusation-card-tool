export default function FactionStatBar({ factionName, currentCount, maxCount, isUnlimited = false }) {
  const percentage = Math.min((currentCount / maxCount) * 100, 100);
  const isOverLimit = !isUnlimited && currentCount > maxCount;
  const barColor = isOverLimit ? 'bg-[#ff4444]' : 'bg-brand-gold';
  const textColor = isOverLimit ? 'text-[#ff8888]' : 'text-gray-300';

  return (
    <div className="stat-bar flex items-center gap-2">
      <div className="w-24">
        <p className="text-[#ccc] text-xs font-semibold truncate">{factionName}</p>
      </div>

      <div className="stat-bar flex-1 h-5 bg-[#555] rounded overflow-hidden border border-[#666]">
        <div
          style={{ width: `${Math.min(percentage, 100)}%` }}
          className={`stat-bar-fill h-full ${barColor} transition-all duration-300`}
        />
      </div>

      <div className="w-16 text-right">
        <p className={`text-xs font-semibold ${textColor}`}>
          {currentCount}/{isUnlimited ? '∞' : maxCount}
        </p>
      </div>
    </div>
  );
}
