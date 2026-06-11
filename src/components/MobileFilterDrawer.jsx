import { useState, useEffect, useCallback } from 'react';
import { Funnel, X } from 'lucide-react';
import { FILTER_OPTIONS, ICON_MENU_SVG } from '../constants/filterOptions.js';
import CustomDropdown from './common/CustomDropdown.jsx';

function toDraftValue(field) {
  return field === '' || field == null ? 'all' : field;
}

const inputClass =
  'w-full px-3 py-2 bg-neutral-800 border-2 border-brand-gold rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold';

export default function MobileFilterDrawer({
  searchTerm = '',
  filters = { faction: '', type: '', symbol: '', mechanic: '' },
  onApply = () => {},
  fabVisible = true,
  fabZIndex = 900,
}) {
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [draftSearch, setDraftSearch] = useState('');
  const [draftFaction, setDraftFaction] = useState('all');
  const [draftType, setDraftType] = useState('all');
  const [draftSymbol, setDraftSymbol] = useState('all');
  const [draftMechanic, setDraftMechanic] = useState('all');

  const syncDrawerFilters = useCallback(() => {
    setDraftSearch(searchTerm);
    setDraftFaction(toDraftValue(filters.faction));
    setDraftType(toDraftValue(filters.type));
    setDraftSymbol(toDraftValue(filters.symbol));
    setDraftMechanic(toDraftValue(filters.mechanic));
  }, [searchTerm, filters.faction, filters.type, filters.symbol, filters.mechanic]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        setOpenDropdown(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const closeDrawer = () => {
    setOpen(false);
    setOpenDropdown(null);
  };

  const applyDrawerFilters = () => {
    onApply({
      searchTerm: draftSearch,
      filters: {
        faction: draftFaction === 'all' ? '' : draftFaction,
        type: draftType === 'all' ? '' : draftType,
        symbol: draftSymbol === 'all' ? '' : draftSymbol,
        mechanic: draftMechanic === 'all' ? '' : draftMechanic,
      },
    });
    closeDrawer();
  };

  const openDrawer = (event) => {
    event.stopPropagation();
    syncDrawerFilters();
    setOpen(true);
  };

  return (
    <>
      {fabVisible && (
        <button
          type="button"
          id="mobileFilterFab"
          aria-label="開啟篩選"
          className="md:hidden fixed bottom-20 right-4 z-[900] flex h-14 w-14 items-center justify-center rounded-full bg-brand-gold text-neutral-900 shadow-[0_4px_20px_rgba(255,215,0,0.4)] hover:bg-amber-300 active:scale-95 transition"
          style={{ zIndex: fabZIndex }}
          onClick={openDrawer}
        >
          <Funnel className="h-6 w-6" aria-hidden strokeWidth={2} />
        </button>
      )}

      {open && (
        <div
          id="drawerBackdrop"
          role="presentation"
          className="fixed inset-0 z-[999] bg-black/50 md:hidden"
          onClick={closeDrawer}
        />
      )}

      <div
        id="mobileFilterDrawer"
        className={`mobile-drawer md:hidden fixed bottom-0 left-0 right-0 z-[1000] max-h-[85vh] overflow-y-auto border-t-2 border-brand-gold bg-[#1a1a1a] p-5 shadow-[0_-4px_24px_rgba(0,0,0,0.4)] transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
        {...(!open ? { inert: true } : {})}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-gold">篩選條件</h2>
          <button
            type="button"
            id="closeDrawer"
            aria-label="關閉抽屜"
            className="inline-flex h-9 w-9 items-center justify-center border-none bg-transparent p-0 text-brand-gold hover:text-amber-300"
            onClick={closeDrawer}
          >
            <X className="h-6 w-6" aria-hidden strokeWidth={2.25} />
          </button>
        </div>

        <label className="sr-only" htmlFor="drawerSearch">
          搜尋卡名或效果
        </label>
        <input
          id="drawerSearch"
          type="text"
          value={draftSearch}
          onChange={(event) => setDraftSearch(event.target.value)}
          placeholder="搜尋卡名或效果..."
          className={`${inputClass} mb-3`}
        />

        <div id="drawerFaction" className="mb-3">
          <p className="mb-1 block text-xs text-gray-400">教團</p>
          <CustomDropdown
            id="drawer-faction"
            value={draftFaction}
            onChange={setDraftFaction}
            options={FILTER_OPTIONS.faction}
            variant="drawer"
            usePortal
            listboxId="drawer-faction-listbox"
            isOpen={openDropdown === 'faction'}
            onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? 'faction' : null)}
            showOptionIcons
            skipIconSrc={ICON_MENU_SVG}
            ariaLabel="教團篩選"
          />
        </div>

        <div id="drawerType" className="mb-3">
          <p className="mb-1 block text-xs text-gray-400">種類</p>
          <CustomDropdown
            id="drawer-type"
            value={draftType}
            onChange={setDraftType}
            options={FILTER_OPTIONS.type}
            variant="drawer"
            usePortal
            listboxId="drawer-type-listbox"
            isOpen={openDropdown === 'type'}
            onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? 'type' : null)}
            ariaLabel="種類篩選"
          />
        </div>

        <div id="drawerSymbol" className="mb-3">
          <p className="mb-1 block text-xs text-gray-400">符號</p>
          <CustomDropdown
            id="drawer-symbol"
            value={draftSymbol}
            onChange={setDraftSymbol}
            options={FILTER_OPTIONS.symbol}
            variant="drawer"
            usePortal
            listboxId="drawer-symbol-listbox"
            isOpen={openDropdown === 'symbol'}
            onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? 'symbol' : null)}
            showOptionIcons
            skipIconSrc={ICON_MENU_SVG}
            ariaLabel="符號篩選"
          />
        </div>

        <div id="drawerMechanic" className="mb-4">
          <p className="mb-1 block text-xs text-gray-400">效果關鍵字</p>
          <CustomDropdown
            id="drawer-mechanic"
            value={draftMechanic}
            onChange={setDraftMechanic}
            options={FILTER_OPTIONS.mechanic}
            variant="drawer"
            usePortal
            listboxId="drawer-mechanic-listbox"
            isOpen={openDropdown === 'mechanic'}
            onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? 'mechanic' : null)}
            ariaLabel="效果關鍵字篩選"
          />
        </div>

        <button
          type="button"
          id="applyDrawerFilters"
          className="btn-apply-rule w-full rounded bg-brand-gold py-3 font-bold text-neutral-900 hover:bg-amber-500 transition"
          onClick={applyDrawerFilters}
        >
          套用篩選
        </button>
      </div>
    </>
  );
}
