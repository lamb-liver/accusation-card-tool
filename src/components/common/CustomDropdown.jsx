import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

const STYLE_MAP = {
  toolbar: {
    wrapper: 'relative w-full',
    trigger:
      'relative w-full rounded-md border bg-[#2a2a2a] py-3 pr-9 text-left text-base leading-snug cursor-pointer transition outline-none focus:outline focus:outline-2 focus:outline-brand-gold focus:border-transparent',
    triggerOpen: 'border-brand-gold',
    triggerClosed: 'border-[#444] hover:border-[#666]',
    withIconPadding: 'pl-9',
    withoutIconPadding: 'pl-3',
    selectedText: 'block truncate pr-1',
    placeholderText: 'text-[#666]',
    chevron:
      'pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#aaa] transition-transform duration-200',
    selectedIcon: 'pointer-events-none absolute left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 object-contain',
    menu:
      'mt-1 max-h-[250px] overflow-y-auto rounded-md border border-[#444] bg-[#2a2a2a] shadow-[0_8px_24px_rgba(0,0,0,0.6)]',
    optionBase: 'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition',
    optionSelected: 'border-l-[3px] border-brand-gold bg-[#3a3a3a] text-amber-300',
    optionIdle: 'border-l-[3px] border-transparent text-gray-200 hover:bg-[#3a3a3a] hover:text-white',
    optionMuted: 'border-l-[3px] border-transparent text-[#666] hover:bg-[#333] hover:text-gray-300',
    optionIcon: 'h-5 w-5 shrink-0 object-contain',
    optionIconSpacer: 'h-5 w-5 shrink-0',
  },
  drawer: {
    wrapper: 'relative',
    trigger:
      'w-full flex items-center gap-2 px-3 py-2 bg-neutral-800 border-2 border-brand-gold rounded text-sm text-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold',
    triggerOpen: '',
    triggerClosed: '',
    withIconPadding: '',
    withoutIconPadding: '',
    selectedText: 'flex-1 text-left truncate',
    placeholderText: 'text-brand-gold/60',
    chevron: 'h-4 w-4 text-brand-gold shrink-0 transition-transform duration-200',
    selectedIcon: 'hidden',
    menu:
      'max-h-60 overflow-y-auto bg-[#2a2a2a] border border-gray-600 rounded-md shadow-2xl py-1',
    optionBase: 'w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors',
    optionSelected: 'bg-white/10 text-brand-gold font-semibold',
    optionIdle: 'text-gray-200 hover:bg-white/5',
    optionMuted: 'text-gray-400 hover:bg-white/5 hover:text-gray-300',
    optionIcon: 'h-5 w-5 shrink-0 object-contain',
    optionIconSpacer: 'h-5 w-5 shrink-0',
  },
};

function hideImgOnError(event) {
  event.currentTarget.style.display = 'none';
}

function setForwardedRef(ref, node) {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(node);
    return;
  }
  ref.current = node;
}

export default function CustomDropdown({
  id,
  value,
  options = [],
  onChange = () => {},
  placeholder = '',
  ariaLabel,
  labelId,
  variant = 'toolbar',
  usePortal = false,
  maxMenuHeight = 240,
  isOpen,
  onOpenChange,
  containerRef,
  showSelectedIcon = false,
  showOptionIcons = false,
  reserveOptionIconSpace = false,
  skipSelectedIconSrc = null,
  skipOptionIconSrc = null,
  wrapperClassName = '',
  triggerClassName = '',
  menuClassName = '',
  optionClassName = '',
  listboxId,
}) {
  const styles = STYLE_MAP[variant] || STYLE_MAP.toolbar;
  const [internalOpen, setInternalOpen] = useState(false);
  const [portalStyle, setPortalStyle] = useState({});
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const controlled = typeof isOpen === 'boolean';
  const open = controlled ? isOpen : internalOpen;

  const stopMenuPointerBubble = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const updateOpen = useCallback(
    (nextOpen) => {
      if (!controlled) setInternalOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [controlled, onOpenChange],
  );

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? options[0] ?? null,
    [options, value],
  );

  const mergedListboxId = listboxId || (id ? `${id}-listbox` : undefined);
  const selectedLabel = selected?.label ?? placeholder;
  const hasValue = Boolean(selected && selected.value !== '');

  const hasSelectedIcon =
    showSelectedIcon &&
    selected?.iconSrc &&
    selected.iconSrc !== skipSelectedIconSrc;

  const computePortalStyle = useCallback(() => {
    if (!usePortal || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceBelow < maxMenuHeight + 8) {
      setPortalStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
      });
      return;
    }

    setPortalStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [maxMenuHeight, usePortal]);

  const handleToggle = useCallback(() => {
    if (open) {
      updateOpen(false);
      return;
    }

    computePortalStyle();
    updateOpen(true);
  }, [computePortalStyle, open, updateOpen]);

  useEffect(() => {
    if (!open || !usePortal) return;
    computePortalStyle();

    const handleViewportChange = () => computePortalStyle();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [computePortalStyle, open, usePortal]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      if (listRef.current?.contains(event.target)) return;
      updateOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open, updateOpen]);

  const renderMenu = () => {
    if (!open) return null;

    const menu = (
      <div
        id={mergedListboxId}
        ref={listRef}
        role="listbox"
        aria-label={ariaLabel || placeholder}
        style={usePortal ? { ...portalStyle, zIndex: 9999 } : undefined}
        className={`${usePortal ? '' : 'absolute left-0 right-0 top-full'} ${styles.menu} ${menuClassName}`}
        onWheel={stopMenuPointerBubble}
        onPointerMove={stopMenuPointerBubble}
      >
        {options.map((option) => {
          const isSelected = option.value === value;
          const showOptionIcon =
            showOptionIcons &&
            option.iconSrc &&
            option.iconSrc !== skipOptionIconSrc;

          const idleClass = option.muted ? styles.optionMuted : styles.optionIdle;

          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                onChange(option.value);
                updateOpen(false);
              }}
              className={`${styles.optionBase} ${isSelected ? styles.optionSelected : idleClass} ${optionClassName}`}
            >
              {showOptionIcon ? (
                <img
                  src={option.iconSrc}
                  alt=""
                  className={styles.optionIcon}
                  onError={hideImgOnError}
                />
              ) : reserveOptionIconSpace ? (
                <span className={styles.optionIconSpacer} aria-hidden />
              ) : null}
              <span className={option.muted ? 'italic' : ''}>{option.label}</span>
            </button>
          );
        })}
      </div>
    );

    if (usePortal) {
      return createPortal(menu, document.body);
    }
    return menu;
  };

  return (
    <div
      ref={(node) => {
        triggerRef.current = node;
        setForwardedRef(containerRef, node);
      }}
      className={`${styles.wrapper} ${wrapperClassName}`}
    >
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={mergedListboxId}
        aria-label={ariaLabel || selectedLabel}
        aria-labelledby={labelId}
        onClick={handleToggle}
        className={`${styles.trigger} ${open ? styles.triggerOpen : styles.triggerClosed} ${hasSelectedIcon ? styles.withIconPadding : styles.withoutIconPadding} ${triggerClassName}`}
      >
        {hasSelectedIcon && (
          <img
            src={selected.iconSrc}
            alt=""
            aria-hidden
            className={styles.selectedIcon}
            onError={hideImgOnError}
          />
        )}

        <span className={`${styles.selectedText} ${hasValue ? '' : styles.placeholderText}`}>
          {selectedLabel}
        </span>

        <ChevronDown
          aria-hidden
          className={`${styles.chevron} ${open ? 'rotate-180' : ''}`}
          strokeWidth={2.25}
        />
      </button>

      {renderMenu()}
    </div>
  );
}
