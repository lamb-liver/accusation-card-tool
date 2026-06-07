import { useEffect, useState } from 'react';
import TurnstileWidget from '../common/TurnstileWidget.jsx';
import { isTurnstileEnabled } from '../../utils/turnstileConfig.js';

const LIMITS = {
  title: { min: 1, max: 40, label: '標題' },
  authorName: { min: 1, max: 24, label: '作者名稱' },
  description: { max: 240, label: '說明' },
};

function stringLength(value) {
  return [...value].length;
}

function validateField(value, { min = 0, max, label }, { required = true } = {}) {
  const trimmed = value.trim();
  const len = stringLength(trimmed);
  if (required && len < min) return `${label}為必填`;
  if (len > max) return `${label}不可超過 ${max} 字`;
  return null;
}

export default function DeckSubmitModal({ open, onClose, onSubmit, isSubmitting = false }) {
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setAuthorName('');
    setDescription('');
    setErrors({});
    setTurnstileToken(null);
    setTurnstileReset((key) => key + 1);
  }, [open]);

  if (!open) return null;

  function validateForm() {
    const next = {
      title: validateField(title, LIMITS.title),
      authorName: validateField(authorName, LIMITS.authorName),
      description: validateField(description, LIMITS.description, { required: false }),
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || !validateForm()) return;

    if (isTurnstileEnabled() && !turnstileToken) {
      setErrors((prev) => ({ ...prev, turnstile: '請完成人機驗證' }));
      return;
    }

    await onSubmit({
      title: title.trim(),
      author_name: authorName.trim(),
      description: description.trim(),
      turnstile_token: turnstileToken ?? undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-[9800] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-submit-title"
      >
        <div className="border-b border-neutral-700 px-5 py-4">
          <h3 id="deck-submit-title" className="text-base font-bold text-brand-gold">
            投稿到分享牆
          </h3>
          <p className="mt-1 text-sm text-gray-400">投稿後需等待管理員審核才會公開</p>
        </div>

        <div className="space-y-3 px-5 py-4">
          <Field
            id="deck-submit-title-input"
            label="標題"
            value={title}
            onChange={setTitle}
            maxLength={LIMITS.title.max}
            error={errors.title}
            required
          />
          <Field
            id="deck-submit-author"
            label="作者名稱"
            value={authorName}
            onChange={setAuthorName}
            maxLength={LIMITS.authorName.max}
            error={errors.authorName}
            required
          />
          <Field
            id="deck-submit-description"
            label="說明（選填）"
            value={description}
            onChange={setDescription}
            maxLength={LIMITS.description.max}
            error={errors.description}
            multiline
          />
          <TurnstileWidget resetKey={turnstileReset} onToken={setTurnstileToken} />
          {errors.turnstile && <p className="text-xs text-red-400">{errors.turnstile}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg bg-neutral-700 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-neutral-600 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-brand-gold px-5 py-2 text-sm font-bold text-neutral-900 transition hover:bg-amber-500 disabled:opacity-50"
          >
            {isSubmitting ? '投稿中…' : '確認投稿'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ id, label, value, onChange, maxLength, error, required = false, multiline = false }) {
  const className =
    'mt-1 w-full rounded-md border bg-neutral-800 px-3 py-2 text-sm text-white outline-none transition focus:border-brand-gold ' +
    (error ? 'border-red-500' : 'border-neutral-600');

  return (
    <div>
      <label htmlFor={id} className="text-sm text-gray-400">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={className}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={className}
        />
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
