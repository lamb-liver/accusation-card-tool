/**
 * @file script.js
 * @description 控訴 - 查卡 & 組牌 & QA 主邏輯
 * @author 羊肝
 */

/* ============================================================
 * 全域變數
 * ============================================================ */

let mockCards      = [];
let deck           = { leader: [], rituals: [], main: [] };
let currentRule    = { isActive: false, type: 'rule1', primary: '', secondary: '' };
let hideSelected   = false;
let filterTimeout  = null;
let isLoading      = false;
let addingLock     = false;
let savedDecks     = [];
let currentPage    = 1;
let perPage        = 0;   // 0 代表顯示全部
let isPaginationMode = false;

let currentFactionValue  = 'all';
let currentSymbolValue   = 'all';
let currentTypeValue     = 'all';
let currentMechanicValue = 'all';
let currentModalCardIndex  = -1;  // 當前顯示的卡牌索引
let currentFilteredCards   = [];  // 當前過濾後的卡牌清單


/* ============================================================
 * Toast 提示系統
 * ============================================================ */

/**
 * 顯示 Toast 通知訊息。
 * @param {string} message - 顯示的文字內容
 * @param {'success'|'error'|'warning'|'info'} [type='success'] - 通知類型
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
        success: 'fa-check-circle',
        error:   'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info:    'fa-info-circle',
    };
    const icon = iconMap[type] ?? 'fa-info-circle';

    toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * 以原生 confirm 對話框模擬非同步確認。
 * @param {string} message - 確認訊息
 * @returns {Promise<boolean>}
 */
function showConfirm(message) {
    return new Promise((resolve) => resolve(confirm(message)));
}


/* ============================================================
 * 活動篩選標籤（Active Filter Indicators）
 * ============================================================ */

/**
 * 更新篩選標籤區塊，反映當前所有啟用的篩選條件。
 */
function updateActiveFilterTags() {
    const container = document.getElementById('activeFilterTags');
    if (!container) return;

    let html = '';

    if (searchInput.value) {
        html += `<span class="active-tag">搜尋: ${searchInput.value} <i class="fas fa-times" onclick="clearSpecificFilter('search')"></i></span>`;
    }
    if (currentFactionValue !== 'all') {
        html += `<span class="active-tag">${currentFactionValue} <i class="fas fa-times" onclick="clearSpecificFilter('faction')"></i></span>`;
    }
    if (currentTypeValue !== 'all') {
        html += `<span class="active-tag">${currentTypeValue} <i class="fas fa-times" onclick="clearSpecificFilter('type')"></i></span>`;
    }
    if (currentSymbolValue !== 'all') {
        html += `<span class="active-tag">${currentSymbolValue} <i class="fas fa-times" onclick="clearSpecificFilter('symbol')"></i></span>`;
    }
    if (currentMechanicValue !== 'all') {
        html += `<span class="active-tag">${currentMechanicValue} <i class="fas fa-times" onclick="clearSpecificFilter('mechanic')"></i></span>`;
    }

    container.innerHTML = html;
}

/**
 * 清除指定的單一篩選條件並重新套用。
 * @param {'search'|'faction'|'type'|'symbol'|'mechanic'} filterType - 要清除的篩選類型
 */
window.clearSpecificFilter = function (filterType) {
    if (filterType === 'search')   searchInput.value    = '';
    if (filterType === 'faction')  currentFactionValue  = 'all';
    if (filterType === 'type')     currentTypeValue     = 'all';
    if (filterType === 'symbol')   currentSymbolValue   = 'all';
    if (filterType === 'mechanic') currentMechanicValue = 'all';

    syncAllSelects();
    updateClearSearchBtn();
    applyAllFilters();
};


/* ============================================================
 * DOM 元素參考
 * ============================================================ */

const gallery           = document.getElementById('cardGallery');
const modal             = document.getElementById('cardModal');
const modalBody         = document.getElementById('modalBody');
const closeModalBtn     = document.getElementById('closeModal');
const searchInput       = document.getElementById('searchInput');
const clearSearchBtn    = document.getElementById('clearSearchBtn');
const deckPoolGallery   = document.getElementById('deckPoolGallery');
const slotLeaderList    = document.querySelector('#slotLeader .slot-list');
const slotRitualsList   = document.querySelector('#slotRituals .slot-list');
const slotMainList      = document.querySelector('#slotMain .slot-list');
const ruleSelect        = document.getElementById('ruleSelect');
const primaryFaction    = document.getElementById('primaryFaction');
const secondaryFaction  = document.getElementById('secondaryFaction');
const btnApplyRule      = document.getElementById('btnApplyRule');
const btnClearDeckOnly  = document.getElementById('btnClearDeckOnly');
const btnResetRule      = document.getElementById('btnResetRule');
const btnGallery        = document.getElementById('btnGallery');
const btnDeckBuilder    = document.getElementById('btnDeckBuilder');
const cardGallerySection  = document.getElementById('cardGallery');
const deckBuilderSection  = document.getElementById('deckBuilder');
const galleryControls   = document.getElementById('galleryControls');
const loadingSpinner    = document.getElementById('loadingSpinner');
const toggleHideCheckbox = document.getElementById('toggleHideSelected');
const btnExportText     = document.getElementById('btnExportDeck');
const btnExportJson     = document.getElementById('btnExportJson');
const btnImport         = document.getElementById('btnImportDeck');
const btnExportImage    = document.getElementById('btnExportImage');
const limitWarningDiv   = document.getElementById('limitWarning');
const btnQA             = document.getElementById('btnQA');
const qaSection         = document.getElementById('qaSection');
const retryBtn          = document.getElementById('retryLoadBtn');


/* ============================================================
 * 圖片延遲載入（IntersectionObserver）
 * ============================================================ */

/** 觀察畫面進入視窗的懶載圖片，進入時才設定真實 src。 */
const imgObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const img = entry.target;
        if (img.dataset.src && !img.src.includes(img.dataset.src)) {
            img.src = img.dataset.src;
            img.onload  = () => { img.style.opacity = '1'; img.setAttribute('data-loaded', 'true'); };
            img.onerror = () => handleImageError(img);
        }
        imgObserver.unobserve(img);
    });
}, { rootMargin: '200px' });

/** 將所有 `.lazy-img` 元素交由 imgObserver 監測。 */
function observeLazyImages() {
    document.querySelectorAll('.lazy-img').forEach(img => imgObserver.observe(img));
}


/* ============================================================
 * 輔助函數
 * ============================================================ */

/**
 * 切換全域載入狀態與旋轉指示器。
 * @param {boolean} show - true 顯示，false 隱藏
 */
function showLoading(show) {
    if (loadingSpinner) loadingSpinner.classList.toggle('hidden', !show);
    isLoading = show;
}

/** 將當前所有篩選條件存入 localStorage。 */
function saveFilters() {
    const filters = {
        search:   searchInput.value,
        faction:  currentFactionValue,
        type:     currentTypeValue,
        symbol:   currentSymbolValue,
        mechanic: currentMechanicValue,
    };
    localStorage.setItem('accusation_filters', JSON.stringify(filters));
}

/** 從 localStorage 還原篩選條件，並重新套用篩選。 */
function loadFilters() {
    const saved = localStorage.getItem('accusation_filters');

    if (saved) {
        const f = JSON.parse(saved);
        searchInput.value    = f.search   || '';
        currentFactionValue  = f.faction  || 'all';
        currentTypeValue     = f.type     || 'all';
        currentSymbolValue   = f.symbol   || 'all';
        currentMechanicValue = f.mechanic || 'all';
    } else {
        currentFactionValue  = 'all';
        currentTypeValue     = 'all';
        currentSymbolValue   = 'all';
        currentMechanicValue = 'all';
    }

    applyAllFilters();
    updateClearSearchBtn();
    syncAllSelects();
}

/** 根據搜尋框是否有內容，決定顯示或隱藏清除按鈕。 */
function updateClearSearchBtn() {
    if (clearSearchBtn) clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
}

/**
 * 將圖片替換為預設佔位圖（圖片載入失敗時使用）。
 * @param {HTMLImageElement} img
 */
function handleImageError(img) {
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280"%3E%3Crect width="200" height="280" fill="%23333"/%3E%3Ctext x="50%25" y="50%25" fill="%23aaa" font-size="14" text-anchor="middle"%3E無圖%3C/text%3E%3C/svg%3E';
    img.onerror = null;
    img.style.opacity = '1';
    img.setAttribute('data-loaded', 'true');
}

/**
 * 依卡牌種類回傳對應的數值標籤 HTML。
 * @param {Object} card - 卡牌資料物件
 * @returns {string} HTML 字串
 */
function getStatsHTML(card) {
    let html = '<div class="stats-container">';

    if (card.type === '信徒') {
        if (card.volume)   html += `<span class="stat vol">聲量: ${card.volume}</span>`;
        if (card.calamity) html += `<span class="stat cal">災厄: ${card.calamity}</span>`;
    } else if (card.type === '地點') {
        if (card.guard)    html += `<span class="stat guard">守護: ${card.guard}</span>`;
        if (card.calamity) html += `<span class="stat cal">災厄: ${card.calamity}</span>`;
    } else if (card.type === '魔法' || card.type === '儀式') {
        if (card.stardust) html += `<span class="stat star">星塵: ${card.stardust}</span>`;
        if (card.calamity) html += `<span class="stat cal">災厄: ${card.calamity}</span>`;
    }

    html += '</div>';
    return html;
}

/**
 * 回傳卡牌符號標籤的 HTML。
 * @param {Object} card - 卡牌資料物件
 * @param {number} [size=14] - 圖示大小（px）
 * @returns {string} HTML 字串
 */
function getSymbolTagsHTML(card, size = 14) {
    return card.symbols.map(sym =>
        `<span class="tag symbol-tag">
            <img src="images/icons/${sym}.png" onerror="this.style.display='none'" alt="${sym}" style="width:${size}px; height:${size}px;">
            <span>${sym}</span>
        </span>`
    ).join('');
}

/**
 * 將效果文字中的符號名稱替換為內嵌圖示。
 * @param {string} effectText - 原始效果文字
 * @returns {string} 含圖示的 HTML 字串
 */
function formatEffectWithSymbols(effectText) {
    if (!effectText) return '';
    const symbols = ['夜幕', '凋零', '野性', '自然', '知識', '煉金', '醫藥', '禁忌'];
    const regex   = new RegExp(`(${symbols.join('|')})`, 'g');
    return effectText.replace(regex, (match) =>
        `<img class="inline-symbol-icon" src="images/icons/${match}.png" alt="${match}" onerror="this.style.display='none'"> ${match}`
    );
}

/**
 * 判斷指定卡牌是否能加入牌組，並回傳阻擋原因。
 * @param {Object} card - 卡牌資料物件
 * @returns {{ blocked: boolean, reason: string }}
 */
function getAddBlockReason(card) {
    const allDeckIds = [...deck.leader, ...deck.rituals, ...deck.main].map(c => c.id);

    if (allDeckIds.includes(card.id))                                 return { blocked: true, reason: '已選擇' };
    if (card.type === '教主'  && deck.leader.length  >= 1)           return { blocked: true, reason: '教主已滿' };
    if (card.type === '儀式'  && deck.rituals.length >= 3)           return { blocked: true, reason: '儀式已滿' };

    // 雙教團規則下的主/次牌數上限檢查
    if (card.type !== '教主' && card.type !== '儀式') {
        if (currentRule.isActive && currentRule.type === 'rule2' && card.faction !== '放逐者') {
            const primaryCount   = deck.main.filter(c => c.faction === currentRule.primary).length;
            const secondaryCount = deck.main.filter(c => c.faction === currentRule.secondary).length;

            if (card.faction === currentRule.primary   && primaryCount   >= 12) return { blocked: true, reason: `${currentRule.primary} 已達 12 張` };
            if (card.faction === currentRule.secondary && secondaryCount >= 8)  return { blocked: true, reason: `${currentRule.secondary} 已達 8 張` };
        }
    }

    return { blocked: false, reason: '' };
}

/**
 * 回傳當前篩選條件的謂詞函數（predicate）。
 * @returns {(card: Object) => boolean}
 */
function getFilterPredicate() {
    const s = searchInput.value.toLowerCase();
    return card => {
        const effectText = card.effect || '';
        const nameText   = card.name   || '';

        const matchText     = nameText.includes(s) || effectText.includes(s);
        const matchMechanic = currentMechanicValue === 'all' || (card.type !== '教主' && effectText.includes(currentMechanicValue));
        const matchFaction  = currentFactionValue  === 'all' || card.faction === currentFactionValue;
        const matchType     = currentTypeValue     === 'all' || card.type    === currentTypeValue;
        const matchSymbol   = currentSymbolValue   === 'all' || card.symbols.includes(currentSymbolValue);

        return matchText && matchMechanic && matchFaction && matchType && matchSymbol;
    };
}

/** 套用所有篩選條件，更新卡牌圖庫、牌組卡池與篩選標籤。 */
function applyAllFilters() {
    const filtered = mockCards.filter(getFilterPredicate());
    currentFilteredCards = filtered;
    document.getElementById('resultCount').innerText = filtered.length;
    renderCards(filtered);
    renderDeckPool();
    saveFilters();
    updateActiveFilterTags();
}

/** 清除所有篩選條件並重新套用。 */
function resetAllFilters() {
    searchInput.value    = '';
    currentFactionValue  = 'all';
    currentTypeValue     = 'all';
    currentSymbolValue   = 'all';
    currentMechanicValue = 'all';
    updateClearSearchBtn();
    syncAllSelects();
    applyAllFilters();
}


/* ============================================================
 * 分頁邏輯
 * ============================================================ */

/**
 * 將卡牌陣列渲染至圖庫，支援分頁模式。
 * @param {Object[]} cards - 要渲染的卡牌陣列
 */
function renderCards(cards) {
    if (!cards.length) {
        gallery.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><p>找不到符合的卡牌</p><button onclick="resetAllFilters()">清除篩選</button></div>`;
        return;
    }

    let html = '';
    if (isPaginationMode && perPage > 0) {
        const totalPages = Math.ceil(cards.length / perPage);
        if (currentPage > totalPages) currentPage = totalPages;

        const start     = (currentPage - 1) * perPage;
        const pageCards = cards.slice(start, start + perPage);

        html  = pageCards.map(card => cardHTML(card)).join('');
        html += renderPagination(totalPages, cards.length);
    } else {
        html = cards.map(card => cardHTML(card)).join('');
    }

    gallery.innerHTML = html;
    observeLazyImages();
}

/**
 * 產生單張卡牌的 HTML 字串。
 * @param {Object} card - 卡牌資料物件
 * @returns {string} HTML 字串
 */
function cardHTML(card) {
    return `
    <div class="card" onclick="openModal('${card.id}')" title="${(card.effect || '').substring(0, 100).replace(/"/g, '&quot;')}">
        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%23333'/%3E%3C/svg%3E"
             data-src="images/${card.id}.webp" class="lazy-img" style="opacity:0.3" alt="${card.name}" loading="lazy">
        <h3>${card.name}</h3>
        <div>
            <span class="tag">${card.faction}</span>
            <span class="tag">${card.type}</span>
            ${card.locationType ? `<span class="tag">${card.locationType}</span>` : ''}
        </div>
        ${getStatsHTML(card)}
        <div>${getSymbolTagsHTML(card, 14)}</div>
    </div>`;
}

/**
 * 產生分頁控制列的 HTML 字串。
 * @param {number} totalPages - 總頁數
 * @param {number} totalCards - 總卡牌數
 * @returns {string} HTML 字串
 */
function renderPagination(totalPages, totalCards) {
    let html = '<div class="pagination">';
    html += `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>◀</button>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }

    html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>▶</button>`;
    html += `<select onchange="setPerPage(this.value)" aria-label="每頁顯示數量">
        <option value="12" ${perPage == 12 ? 'selected' : ''}>12張/頁</option>
        <option value="24" ${perPage == 24 ? 'selected' : ''}>24張/頁</option>
        <option value="48" ${perPage == 48 ? 'selected' : ''}>48張/頁</option>
        <option value="0"  ${!isPaginationMode ? 'selected' : ''}>顯示全部</option>
    </select></div>`;
    return html;
}

/**
 * 切換至指定頁碼。
 * @param {number} page - 目標頁碼
 */
function changePage(page) {
    currentPage = page;
    applyAllFilters();
}

/**
 * 設定每頁顯示數量，並重置至第一頁。
 * @param {string|number} val - 每頁張數（0 代表顯示全部）
 */
function setPerPage(val) {
    perPage          = parseInt(val);
    isPaginationMode = perPage > 0;
    currentPage      = 1;
    applyAllFilters();
}

/** 顯示骨架屏載入佔位符。 */
function showSkeleton() {
    const skeletonHtml = Array(8).fill(document.getElementById('skeletonCard')?.innerHTML || '').join('');
    gallery.innerHTML  = `<div class="gallery-skeleton">${skeletonHtml}</div>`;
}

/** 骨架屏清除（目前保留供未來使用）。 */
function hideSkeleton() { /* 保留擴充點 */ }

/** 使用 debounce 延遲套用篩選，避免輸入過程中頻繁重繪。 */
function debouncedFilter() {
    if (filterTimeout) clearTimeout(filterTimeout);
    showSkeleton();
    filterTimeout = setTimeout(() => {
        applyAllFilters();
        hideSkeleton();
    }, 200);
}


/* ============================================================
 * 卡片 Modal
 * ============================================================ */

/**
 * 開啟卡片詳細資料 Modal。
 * @param {string} cardId - 卡牌 ID
 */
function openModal(cardId) {
    currentModalCardIndex = currentFilteredCards.findIndex(c => c.id === cardId);
    const card = currentModalCardIndex !== -1
        ? currentFilteredCards[currentModalCardIndex]
        : mockCards.find(c => c.id === cardId);
    if (!card) return;

    const symbolTags = card.symbols.map(sym =>
        `<div class="tag symbol-tag">
            <img src="images/icons/${sym}.png" onerror="this.style.display='none'" style="width:20px;">
            <span>${sym}</span>
        </div>`
    ).join('');

    modalBody.innerHTML = `
        <div class="modal-details">
            <img src="images/${card.id}.webp" alt="${card.name}" style="width:100%;border-radius:5px;" onerror="handleImageError(this)">
            <h2 id="modalTitle">${card.name}</h2>
            <p>
                <strong>教團：</strong>${card.faction} |
                <strong>種類：</strong>${card.type}
                ${card.locationType ? ` | <strong>標記：</strong>${card.locationType}` : ''}
            </p>
            ${getStatsHTML(card)}
            <div><strong>符號：</strong><br>${symbolTags}</div>
            <div class="effect-text"><strong>效果：</strong><p>${formatEffectWithSymbols(card.effect)}</p></div>
            <div style="margin-top:15px;">
                <button id="modalAddBtn" class="btn-apply-rule" style="width:100%;">＋ 加入牌組</button>
            </div>
        </div>`;

    modal.style.display = 'flex';
    document.getElementById('modalAddBtn').addEventListener('click', () => {
        addToDeck(cardId);
        modal.style.display = 'none';
    });

    updateModalNavButtons();
}

/** 根據當前索引更新 Modal 左右切換按鈕的啟用狀態。 */
function updateModalNavButtons() {
    const prevBtn = document.getElementById('modalPrevBtn');
    const nextBtn = document.getElementById('modalNextBtn');

    if (currentModalCardIndex === -1) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    prevBtn.disabled = currentModalCardIndex <= 0;
    nextBtn.disabled = currentModalCardIndex >= currentFilteredCards.length - 1;
}

/**
 * 在 Modal 中切換至前一張或後一張卡牌。
 * @param {-1|1} direction - -1 為上一張，1 為下一張
 */
function navigateModal(direction) {
    if (currentModalCardIndex === -1) return;

    const newIndex = currentModalCardIndex + direction;
    if (newIndex >= 0 && newIndex < currentFilteredCards.length) {
        openModal(currentFilteredCards[newIndex].id);
    }
}


/* ============================================================
 * 加入牌組
 * ============================================================ */

/**
 * 將指定卡牌加入牌組，並依規則驗證合法性。
 * @param {string} cardId - 卡牌 ID
 * @param {HTMLElement} [btn] - 觸發的按鈕元素（用於動畫）
 */
function addToDeck(cardId, btn) {
    if (addingLock) return;

    const card = mockCards.find(c => c.id === cardId);
    if (!card) return;

    const allDeckIds = [...deck.leader, ...deck.rituals, ...deck.main].map(c => c.id);
    if (allDeckIds.includes(card.id)) return showToast('此卡已在牌組中！', 'warning');

    // 放逐者（中立）不受教團規則限制
    if (card.faction === '放逐者') {
        deck.main.push(card);
        if (btn) animateAddButton(btn, cardId);
        updateDeckUI();
        return;
    }

    // 尚未套用規則時，引導使用者設定教團
    if (!currentRule.isActive) {
        const preselected = primaryFaction.value;

        if (!preselected) {
            if (!confirm(`將「${card.faction}」設為主要教團？`)) return;
            primaryFaction.value = card.faction;
            applyRuleLogic();
        } else if (preselected === card.faction) {
            applyRuleLogic();
        } else {
            const choice = confirm(
                `您的主要教團已是「${preselected}」。\n\n` +
                `「${card.name}」屬於「${card.faction}」。\n\n` +
                `是否切換為【雙教團規則】，將「${card.faction}」加入為次要教團？\n\n` +
                `（按「取消」可手動調整設定）`
            );
            if (!choice) return;

            ruleSelect.value = 'rule2';
            secondaryFaction.classList.remove('hidden');
            secondaryFaction.value = card.faction;
            updateSecondaryOptions();
            applyRuleLogic();
        }
        return;
    }

    // 已套用規則後，依卡牌種類分別驗證
    if (card.type === '教主') {
        if (deck.leader.length >= 1)              return showToast('教主已滿');
        if (card.faction !== currentRule.primary) return showToast('教主必須與主要教團相同');
        deck.leader.push(card);

    } else if (card.type === '儀式') {
        if (deck.rituals.length >= 3)             return showToast('儀式已滿');
        if (card.faction !== currentRule.primary) return showToast('儀式必須與主要教團相同');
        deck.rituals.push(card);

    } else {
        // 雙教團規則：若次要教團尚未設定，提示使用者確認
        if (currentRule.type === 'rule2' && !currentRule.secondary && card.faction !== currentRule.primary) {
            const confirmSet = confirm(
                `「${card.name}」屬於「${card.faction}」。\n` +
                `您的主要教團是「${currentRule.primary}」。\n` +
                `是否將「${card.faction}」設為次要教團並加入牌組？`
            );
            if (confirmSet) {
                secondaryFaction.value = card.faction;
                updateSecondaryOptions();
                applyRuleLogic();
                addToDeck(cardId, btn);
            }
            return;
        }

        // 雙教團規則：牌數上限與教團合法性檢查
        if (currentRule.type === 'rule2' && card.faction !== '放逐者') {
            const pc = deck.main.filter(c => c.faction === currentRule.primary).length;
            const sc = deck.main.filter(c => c.faction === currentRule.secondary).length;

            if (card.faction === currentRule.primary   && pc >= 12) return showToast('主要教團最多12張');
            if (card.faction === currentRule.secondary && sc >= 8)  return showToast('次要教團最多8張');
            if (currentRule.secondary && card.faction !== currentRule.primary && card.faction !== currentRule.secondary) {
                return showToast('不能加入第三教團的牌');
            }
        }

        deck.main.push(card);
    }

    if (btn) animateAddButton(btn, cardId);
    updateDeckUI();
}

/**
 * 播放「已加入」按鈕動畫並短暫鎖定重複點擊。
 * @param {HTMLElement} btn - 觸發的按鈕元素
 * @param {string} cardId   - 卡牌 ID（保留供未來擴充）
 */
function animateAddButton(btn, cardId) {
    addingLock       = true;
    btn.textContent  = '✓ 已加入';
    btn.disabled     = true;
    btn.style.background = '#2a6b2f';
    btn.classList.add('flash-green');

    setTimeout(() => {
        btn.classList.remove('flash-green');
        addingLock = false;
    }, 500);
}

/**
 * 從指定牌組區塊中移除卡牌。
 * @param {string} cardId      - 卡牌 ID
 * @param {'leader'|'rituals'|'main'} typeCategory - 所屬區塊
 */
function removeFromDeck(cardId, typeCategory) {
    deck[typeCategory] = deck[typeCategory].filter(c => c.id !== cardId);
    updateDeckUI();
}


/* ============================================================
 * 更新牌組 UI
 * ============================================================ */

/** 若主牌組超過 20 張則顯示警告，否則隱藏。 */
function updateLimitWarning() {
    const mainCount = deck.main.length;
    if (!limitWarningDiv) return;

    if (mainCount > 20) {
        const over = mainCount - 20;
        limitWarningDiv.innerHTML = `⚠️ 主牌組超過上限 ${over} 張！請刪減至20張以內。`;
        limitWarningDiv.classList.remove('hidden', 'warning-over');
        limitWarningDiv.classList.add('warning-over');
    } else {
        limitWarningDiv.classList.add('hidden');
    }
}

/** 重新渲染牌組計數、列表、卡池與儲存資料。 */
function updateDeckUI() {
    const total = deck.leader.length + deck.rituals.length + deck.main.length;

    document.getElementById('totalCount').innerText    = total;
    document.getElementById('leaderCount').innerText   = deck.leader.length;
    document.getElementById('ritualsCount').innerText  = deck.rituals.length;
    document.getElementById('mainCount').innerText     = deck.main.length;
    document.getElementById('factionStatsArea').innerHTML = getFactionStatsHTML();

    /**
     * 將卡牌陣列渲染為 <li> 列表 HTML。
     * @param {Object[]} cards - 卡牌陣列
     * @param {string} cat     - 牌組區塊名稱
     * @returns {string}
     */
    const renderList = (cards, cat) => cards.map(c => `
        <li>
            <span onclick="openModal('${c.id}')">[${c.type}] <span class="deck-card-name">${c.name}</span></span>
            <button onclick="removeFromDeck('${c.id}','${cat}')">X</button>
            <div class="swipe-bg">刪除</div>
        </li>`).join('');

    slotLeaderList.innerHTML  = renderList(deck.leader,  'leader');
    slotRitualsList.innerHTML = renderList(deck.rituals, 'rituals');
    slotMainList.innerHTML    = renderList(deck.main,    'main');

    renderDeckPool();
    saveDeckData();
    makeSwipeableAll();
    observeLazyImages();
    updateLimitWarning();
}

/**
 * 產生教團配額進度條 HTML。
 * @returns {string} HTML 字串
 */
function getFactionStatsHTML() {
    if (!currentRule.isActive) return '<div class="faction-stats">⚠️ 尚未套用規則</div>';

    const primary    = currentRule.primary;
    const secondary  = currentRule.secondary;
    const exileCount = deck.main.filter(c => c.faction === '放逐者').length;

    /**
     * 產生單條進度條 HTML。
     * @param {string} label   - 標籤文字
     * @param {number} count   - 當前數量
     * @param {number} max     - 上限數量
     * @param {string} [color='#ffd700'] - 進度條顏色
     * @returns {string}
     */
    const renderBar = (label, count, max, color = '#ffd700') => {
        let percent   = (count / max) * 100;
        let barColor  = color;
        let textColor = '';

        if (count > max) {
            percent   = 100;
            barColor  = '#ff4444';
            textColor = 'style="color:#ff8888;"';
        }

        return `<div class="stat-bar">
            <span>${label}</span>
            <div class="bar"><div style="width:${percent}%; background:${barColor};"></div></div>
            <span ${textColor}>${count}/${max}</span>
        </div>`;
    };

    if (currentRule.type === 'rule1') {
        const count = deck.main.filter(c => c.faction === primary).length;
        return `<div class="faction-stats">
            ${renderBar(primary, count, 20)}
            ${exileCount ? renderBar('放逐者', exileCount, 100, '#888') : ''}
        </div>`;
    }

    if (currentRule.type === 'rule2' && secondary) {
        const pCount = deck.main.filter(c => c.faction === primary).length;
        const sCount = deck.main.filter(c => c.faction === secondary).length;
        return `<div class="faction-stats">
            ${renderBar(primary,    pCount, 12)}
            ${renderBar(secondary,  sCount, 8, '#c0a040')}
            ${exileCount ? renderBar('放逐者', exileCount, 100, '#888') : ''}
        </div>`;
    }

    return '';
}

/** 渲染組牌模式的可選卡池（依規則與篩選過濾）。 */
function renderDeckPool() {
    const allDeckIds = [...deck.leader, ...deck.rituals, ...deck.main].map(c => c.id);
    let availableCards = mockCards.filter(getFilterPredicate());

    // 依當前規則過濾可選卡牌
    if (currentRule.isActive) {
        availableCards = availableCards.filter(card => {
            if (card.faction === '放逐者')                     return true;
            if (card.type === '教主' || card.type === '儀式') return card.faction === currentRule.primary;
            if (currentRule.type === 'rule1')                  return card.faction === currentRule.primary;
            if (currentRule.type === 'rule2') {
                if (!currentRule.secondary) return true;
                return card.faction === currentRule.primary || card.faction === currentRule.secondary;
            }
            return true;
        });
    }

    // 隱藏已選卡牌
    if (hideSelected) availableCards = availableCards.filter(card => !allDeckIds.includes(card.id));

    if (!availableCards.length) {
        deckPoolGallery.innerHTML = `<div class="empty-state"><i class="fas fa-database"></i><p>沒有可選的卡牌，請調整篩選或規則</p></div>`;
        return;
    }

    deckPoolGallery.innerHTML = availableCards.map(card => {
        const isSelected        = allDeckIds.includes(card.id);
        const { blocked, reason } = getAddBlockReason(card);

        let btnHTML = '';
        if (isSelected) {
            btnHTML = `<button disabled style="width:100%;padding:8px;margin-top:10px;background:#444;color:#888;">已選擇</button>`;
        } else if (blocked) {
            btnHTML = `<button disabled title="${reason}" style="width:100%;padding:8px;margin-top:10px;background:#2a2a2a;color:#666;">🚫 ${reason}</button>`;
        } else {
            btnHTML = `<button class="add-icon-btn" onclick="addToDeck('${card.id}', this)"><i class="fas fa-plus-circle"></i></button>`;
        }

        return `
            <div class="card" style="padding:10px;display:flex;flex-direction:column;justify-content:space-between;height:100%;">
                <div>
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%23333'/%3E%3C/svg%3E"
                         data-src="images/${card.id}.webp" class="lazy-img" style="opacity:0.3; width:100%; border-radius:5px; cursor:zoom-in;"
                         onclick="openModal('${card.id}')" onerror="handleImageError(this)">
                    <h4>${card.name}</h4>
                    <div>
                        <span class="tag">${card.faction}</span>
                        <span class="tag">${card.type}</span>
                        ${card.locationType ? `<span class="tag">${card.locationType}</span>` : ''}
                    </div>
                    <div>${getSymbolTagsHTML(card, 14)}</div>
                </div>
                ${btnHTML}
            </div>`;
    }).join('');

    observeLazyImages();
}


/* ============================================================
 * 滑動刪除動畫
 * ============================================================ */

/** 為所有牌組列表項目綁定觸控滑動刪除事件。 */
function makeSwipeableAll() {
    document.querySelectorAll('.slot-list li').forEach(li => {
        let startX = 0;

        li.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            li.classList.remove('swiping');
        });

        li.addEventListener('touchend', (e) => {
            const diff = e.changedTouches[0].clientX - startX;

            // 向左滑動超過 50px 視為刪除手勢
            if (diff < -50) {
                li.classList.add('swiping');
                setTimeout(() => {
                    li.querySelector('button')?.click();
                    li.classList.remove('swiping');
                }, 300);
            } else {
                li.classList.remove('swiping');
            }
        });
    });
}


/* ============================================================
 * 規則設定
 * ============================================================ */

/** 更新次要教團下拉選單，隱藏與主要教團相同的選項。 */
function updateSecondaryOptions() {
    const selectedPrimary = primaryFaction.value;

    Array.from(secondaryFaction.options).forEach(option => {
        if (!option.value) return;
        const isSame = option.value === selectedPrimary;
        option.hidden   = isSame;
        option.disabled = isSame;
        if (isSame && secondaryFaction.value === selectedPrimary) secondaryFaction.value = '';
    });
}

/** 讀取表單設定、驗證衝突並套用新規則至全域狀態。 */
function applyRuleLogic() {
    const newRule = {
        isActive:  true,
        type:      ruleSelect.value,
        primary:   primaryFaction.value,
        secondary: secondaryFaction.value,
    };

    const fixed = checkAndFixRuleViolations(newRule);
    if (fixed.changed) {
        showToast(`⚠️ 新規則與現有牌組衝突，已自動移除 ${fixed.removedCount} 張違規卡牌。`);
    }

    currentRule = newRule;
    updateDeckUI();
}

/**
 * 依新規則移除牌組中的違規卡牌，並回傳變更結果。
 * @param {{ isActive: boolean, type: string, primary: string, secondary: string }} newRule - 新規則
 * @returns {{ changed: boolean, removedCount: number }}
 */
function checkAndFixRuleViolations(newRule) {
    let removedCount = 0;
    const isRule2   = newRule.type === 'rule2';
    const primary   = newRule.primary;
    const secondary = newRule.secondary;

    // 教主合法性過濾
    const newLeader = deck.leader.filter(card => card.faction === '放逐者' || card.faction === primary);
    removedCount   += deck.leader.length - newLeader.length;
    deck.leader     = newLeader;

    // 儀式合法性過濾
    const newRituals = deck.rituals.filter(card => card.faction === '放逐者' || card.faction === primary);
    removedCount    += deck.rituals.length - newRituals.length;
    deck.rituals     = newRituals;

    // 主牌組教團合法性過濾
    const newMain = deck.main.filter(card => {
        if (card.faction === '放逐者') return true;
        if (isRule2) return card.faction === primary || card.faction === secondary;
        return card.faction === primary;
    });
    removedCount += deck.main.length - newMain.length;
    deck.main     = newMain;

    // 雙教團規則下的牌數上限過濾
    if (isRule2 && secondary) {
        const primaryCards   = deck.main.filter(c => c.faction === primary);
        const secondaryCards = deck.main.filter(c => c.faction === secondary);

        if (primaryCards.length > 12) {
            const toRemove = primaryCards.slice(12);
            deck.main    = deck.main.filter(c => !toRemove.includes(c));
            removedCount += toRemove.length;
        }
        if (secondaryCards.length > 8) {
            const toRemove = secondaryCards.slice(8);
            deck.main    = deck.main.filter(c => !toRemove.includes(c));
            removedCount += toRemove.length;
        }
    }

    return { changed: removedCount > 0, removedCount };
}


/* ============================================================
 * 儲存 / 載入 / 備份
 * ============================================================ */

/** localStorage 儲存鍵名（v2 格式）。 */
const STORAGE_KEY = 'accusation_deck_v2';

/** 將當前牌組與規則序列化後存入 localStorage。 */
function saveDeckData() {
    const data = {
        version: 2,
        leader:  deck.leader.map(c => c.id),
        rituals: deck.rituals.map(c => c.id),
        main:    deck.main.map(c => c.id),
        rule:    currentRule,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** 從 localStorage 還原牌組與規則設定。 */
function loadDeckData() {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('accusation_deck');
    if (!raw) return;

    try {
        const data = JSON.parse(raw);

        if (data.version === 2 || data.leader) {
            deck.leader  = (data.leader  || []).map(id => mockCards.find(c => c.id === id)).filter(Boolean);
            deck.rituals = (data.rituals || []).map(id => mockCards.find(c => c.id === id)).filter(Boolean);
            deck.main    = (data.main    || []).map(id => mockCards.find(c => c.id === id)).filter(Boolean);

            if (data.rule) {
                currentRule = data.rule;
                ruleSelect.value      = currentRule.type;
                primaryFaction.value  = currentRule.primary;
                updateSecondaryOptions();

                if (currentRule.type === 'rule2') {
                    secondaryFaction.classList.remove('hidden');
                    secondaryFaction.value = currentRule.secondary;
                }
            }
        }
    } catch (e) { /* 忽略解析錯誤，保持空牌組 */ }

    updateDeckUI();
}


/* ============================================================
 * 匯出 / 匯入
 * ============================================================ */

/** 將牌組清單格式化為純文字並複製至剪貼簿。 */
function exportAsText() {
    const total = deck.leader.length + deck.rituals.length + deck.main.length;
    if (total === 0) return showToast('⚠️ 牌組是空的，沒有可以匯出的內容。');

    const ruleLabel = currentRule.type === 'rule2'
        ? `雙教團（主：${currentRule.primary}／次：${currentRule.secondary}）`
        : `單教團（${currentRule.primary}）`;

    let text = `【控訴】牌組清單\n構築規則：${ruleLabel}\n總張數：${total}/24\n═══════════════════\n`;
    if (deck.leader.length)  text += `\n👑 教主（${deck.leader.length}/1）\n${deck.leader.map(c => `  · ${c.name}（${c.faction}）`).join('\n')}\n`;
    if (deck.rituals.length) text += `\n🔥 儀式（${deck.rituals.length}/3）\n${deck.rituals.map(c => `  · ${c.name}（${c.faction}）`).join('\n')}\n`;
    if (deck.main.length)    text += `\n🎴 主牌組（${deck.main.length}/20）\n${deck.main.map(c => `  · ${c.name}（${c.faction} / ${c.type}）`).join('\n')}\n`;
    text += `\n═══════════════════\n（由「控訴-卡牌查詢與組牌」匯出）`;

    navigator.clipboard.writeText(text)
        .then(() => showToast('✅ 牌組清單已複製到剪貼簿！'))
        .catch(() => prompt('請手動複製以下文字：', text));
}

/** 將牌組序列化為 JSON 備份字串並複製至剪貼簿。 */
function exportAsJson() {
    const data = {
        version: 2,
        rule: currentRule,
        deck: {
            leader:  deck.leader.map(c => c.id),
            rituals: deck.rituals.map(c => c.id),
            main:    deck.main.map(c => c.id),
        },
    };

    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
        .then(() => showToast('✅ JSON 備份已複製'))
        .catch(() => showToast('複製失敗'));
}

/** 將牌組清單區塊截圖並下載為 PNG 圖片。 */
async function exportDeckAsImage() {
    const originalElement = document.querySelector('.deck-list-section');
    if (!originalElement) return;

    // 複製節點以避免影響原始版面
    const clone = originalElement.cloneNode(true);
    Object.assign(clone.style, {
        position:  'absolute',
        top:       '-9999px',
        left:      '-9999px',
        width:     `${originalElement.offsetWidth}px`,
        height:    'auto',
        maxHeight: 'none',
        overflow:  'visible',
    });
    document.body.appendChild(clone);

    try {
        const canvas = await html2canvas(clone, {
            scale: 2,
            backgroundColor: '#1a1a1a',
            logging: false,
            useCORS: false,
        });

        const link     = document.createElement('a');
        link.download  = 'my_deck.png';
        link.href      = canvas.toDataURL();
        link.click();
    } catch (err) {
        console.error(err);
        showToast('匯出圖片失敗，可嘗試縮短牌組或重新整理頁面');
    } finally {
        document.body.removeChild(clone);
    }
}

/** 從剪貼簿文字（JSON 或純文字格式）匯入牌組。 */
function importDeck() {
    const text = prompt('貼上牌組清單（文字或 JSON 格式）');
    if (!text) return;

    /* ---- 嘗試 JSON 格式解析 ---- */
    try {
        const json = JSON.parse(text);

        if (json.deck && json.version) {
            if (!confirm('匯入 JSON 牌組備份，目前牌組將被覆蓋，確定嗎？')) return;

            deck.leader  = (json.deck.leader  || []).map(id => mockCards.find(c => c.id === id)).filter(Boolean);
            deck.rituals = (json.deck.rituals || []).map(id => mockCards.find(c => c.id === id)).filter(Boolean);
            deck.main    = (json.deck.main    || []).map(id => mockCards.find(c => c.id === id)).filter(Boolean);

            if (json.rule) {
                currentRule           = json.rule;
                ruleSelect.value      = currentRule.type;
                primaryFaction.value  = currentRule.primary;
                updateSecondaryOptions();

                if (currentRule.type === 'rule2') {
                    secondaryFaction.classList.remove('hidden');
                    secondaryFaction.value = currentRule.secondary;
                } else {
                    secondaryFaction.classList.add('hidden');
                    secondaryFaction.value = '';
                }
            }

            updateDeckUI();
            showToast('✅ JSON 匯入成功');
            return;
        }
    } catch (e) { /* 非 JSON，繼續嘗試純文字解析 */ }

    /* ---- 嘗試純文字格式解析 ---- */
    try {
        const lines   = text.split('\n');
        const newDeck = { leader: [], rituals: [], main: [] };
        let currentSection = '';

        for (let line of lines) {
            line = line.trim();

            if (line.includes('教主'))    currentSection = 'leader';
            else if (line.includes('儀式'))  currentSection = 'rituals';
            else if (line.includes('主牌組')) currentSection = 'main';
            else if (line.startsWith('·')) {
                const match = line.match(/· (.+)（(.+)）/);
                if (match && currentSection) {
                    const card = mockCards.find(c => c.name === match[1]);
                    if (card) newDeck[currentSection].push(card);
                }
            }
        }

        // 與當前規則進行衝突檢查
        if (currentRule.isActive) {
            const violations = [];
            const isRule2    = currentRule.type === 'rule2';
            const primary    = currentRule.primary;
            const secondary  = currentRule.secondary;

            newDeck.leader.forEach(card => {
                if (card.faction !== '放逐者' && card.faction !== primary)
                    violations.push(`教主「${card.name}」教團不符（需為 ${primary}）`);
            });
            newDeck.rituals.forEach(card => {
                if (card.faction !== '放逐者' && card.faction !== primary)
                    violations.push(`儀式「${card.name}」教團不符（需為 ${primary}）`);
            });

            const primaryCount   = newDeck.main.filter(c => c.faction === primary).length;
            const secondaryCount = newDeck.main.filter(c => c.faction === secondary).length;
            const otherCount     = newDeck.main.filter(c => c.faction !== '放逐者' && c.faction !== primary && c.faction !== secondary).length;

            if (isRule2) {
                if (primaryCount   > 12) violations.push(`主要教團 ${primary} 超過 12 張 (${primaryCount})`);
                if (secondaryCount > 8)  violations.push(`次要教團 ${secondary} 超過 8 張 (${secondaryCount})`);
                if (otherCount     > 0)  violations.push(`包含不允許的第三教團卡牌 ${otherCount} 張`);
            } else {
                const otherMain = newDeck.main.filter(c => c.faction !== '放逐者' && c.faction !== primary);
                if (otherMain.length > 0) violations.push(`包含非主要教團的卡牌 ${otherMain.length} 張`);
            }

            if (violations.length > 0) {
                const msg = `⚠️ 匯入的牌組不符合當前規則：\n${violations.join('\n')}\n\n仍要強行匯入嗎？（可能導致後續加入卡牌失敗）`;
                if (!confirm(msg)) return;
            }
        }

        deck = newDeck;
        updateDeckUI();
        showToast('✅ 文字牌組匯入成功！');
    } catch (e) {
        showToast('❌ 匯入失敗，格式錯誤');
        console.error(e);
    }
}


/* ============================================================
 * 多牌組管理
 * ============================================================ */

/** 多牌組的 localStorage 儲存鍵名。 */
const DECK_STORAGE_KEY = 'accusation_all_decks';

/** 從 localStorage 讀取所有已儲存牌組並更新列表。 */
function loadAllDecks() {
    const stored = localStorage.getItem(DECK_STORAGE_KEY);
    if (stored) {
        try { savedDecks = JSON.parse(stored); } catch (e) { savedDecks = []; }
    } else {
        savedDecks = [];
    }
    renderSavedDecksList();
}

/** 將所有已儲存牌組寫回 localStorage。 */
function saveAllDecks() {
    localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(savedDecks));
}

/** 重新渲染已儲存牌組列表，並綁定載入與刪除事件。 */
function renderSavedDecksList() {
    const container = document.getElementById('savedDecksList');
    if (!container) return;

    if (savedDecks.length === 0) {
        container.innerHTML = '<div style="color:#888; font-size:12px;">尚無儲存牌組</div>';
        return;
    }

    container.innerHTML = savedDecks.map((item, idx) => `
        <div class="saved-deck-item">
            <span title="${item.rule?.primary || '無規則'}">📁 ${escapeHtml(item.name)}</span>
            <div>
                <button class="load-deck-btn" data-index="${idx}">載入</button>
                <button class="delete-deck-btn" data-index="${idx}">🗑️</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.load-deck-btn').forEach(btn => {
        btn.addEventListener('click', () => loadDeckFromSaved(parseInt(btn.dataset.index)));
    });
    document.querySelectorAll('.delete-deck-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index);
            if (confirm(`刪除牌組「${savedDecks[idx].name}」？`)) {
                savedDecks.splice(idx, 1);
                saveAllDecks();
                renderSavedDecksList();
            }
        });
    });
}

/** 儲存當前牌組至多牌組管理清單（上限 10 組）。 */
function saveCurrentDeck() {
    const nameInput = document.getElementById('deckNameInput');
    const name      = nameInput.value.trim();

    if (!name) { showToast('請輸入牌組名稱'); return; }
    if (savedDecks.length >= 10) {
        showToast('已達儲存上限（10組），請先刪除舊牌組');
        return;
    }
    if (savedDecks.some(d => d.name === name)) {
        if (!confirm(`牌組「${name}」已存在，是否覆蓋？`)) return;
        savedDecks = savedDecks.filter(d => d.name !== name);
    }

    savedDecks.push({
        name,
        deck: { leader: [...deck.leader], rituals: [...deck.rituals], main: [...deck.main] },
        rule: JSON.parse(JSON.stringify(currentRule)),
    });

    saveAllDecks();
    renderSavedDecksList();
    nameInput.value = '';
    showToast(`✅ 牌組「${name}」已儲存`);
}

/**
 * 載入指定索引的已儲存牌組至工作區。
 * @param {number} index - savedDecks 陣列索引
 */
function loadDeckFromSaved(index) {
    const item = savedDecks[index];
    if (!item) return;
    if (!confirm(`載入牌組「${item.name}」？\n目前牌組將被覆蓋。`)) return;

    deck = {
        leader:  [...item.deck.leader],
        rituals: [...item.deck.rituals],
        main:    [...item.deck.main],
    };

    if (item.rule?.isActive) {
        currentRule           = JSON.parse(JSON.stringify(item.rule));
        ruleSelect.value      = currentRule.type;
        primaryFaction.value  = currentRule.primary;
        updateSecondaryOptions();

        if (currentRule.type === 'rule2') {
            secondaryFaction.classList.remove('hidden');
            secondaryFaction.value = currentRule.secondary;
        } else {
            secondaryFaction.classList.add('hidden');
            secondaryFaction.value = '';
        }
    } else {
        currentRule = { isActive: false, type: 'rule1', primary: '', secondary: '' };
        ruleSelect.value      = 'rule1';
        primaryFaction.value  = '';
        secondaryFaction.value = '';
        secondaryFaction.classList.add('hidden');
    }

    updateDeckUI();
    showToast(`已載入牌組「${item.name}」`);
}

/**
 * 轉義 HTML 特殊字元，防止 XSS。
 * @param {string} str - 原始字串
 * @returns {string} 轉義後的字串
 */
function escapeHtml(str) {
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m] ?? m);
}


/* ============================================================
 * 自訂下拉元件
 * ============================================================ */

/**
 * 初始化教團自訂下拉選單。
 * @param {string|HTMLElement} containerSelector - 容器選擇器或元素
 */
function initFactionCustomSelect(containerSelector) {
    const customSelect = typeof containerSelector === 'string'
        ? document.querySelector(containerSelector)
        : containerSelector;
    if (!customSelect) return;

    const trigger      = customSelect.querySelector('.custom-select-trigger');
    const options      = customSelect.querySelectorAll('.custom-option');
    const selectedImg  = customSelect.querySelector('.selected-icon');
    const selectedText = customSelect.querySelector('.selected-text');

    /** 更新顯示選中的選項。 */
    const setSelectedOption = (value) => {
        const targetOpt = Array.from(options).find(opt => opt.dataset.value === value)
            ?? Array.from(options).find(opt => opt.dataset.value === 'all');

        if (!targetOpt) return;
        const imgSrc = targetOpt.querySelector('img')?.src;
        const text   = targetOpt.querySelector('span')?.innerText;

        if (selectedImg  && imgSrc) selectedImg.src        = imgSrc;
        if (selectedText && text)   selectedText.innerText = text;

        options.forEach(o => o.classList.remove('selected'));
        targetOpt.classList.add('selected');
        currentFactionValue = targetOpt.dataset.value;
    };

    setSelectedOption(currentFactionValue);

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-select.open').forEach(el => {
            if (el !== customSelect) el.classList.remove('open');
        });
        customSelect.classList.toggle('open');
    });

    options.forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const imgSrc = opt.querySelector('img')?.src;
            const text   = opt.querySelector('span')?.innerText;

            if (selectedImg  && imgSrc) selectedImg.src        = imgSrc;
            if (selectedText && text)   selectedText.innerText = text;

            options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            currentFactionValue = opt.dataset.value;

            customSelect.classList.remove('open');
            applyAllFilters();
            saveFilters();
            syncAllSelects();
        });
    });

    document.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target)) customSelect.classList.remove('open');
    });
}

/**
 * 初始化符號自訂下拉選單。
 * @param {string|HTMLElement} containerSelector - 容器選擇器或元素
 */
function initSymbolCustomSelect(containerSelector) {
    const customSelect = typeof containerSelector === 'string'
        ? document.querySelector(containerSelector)
        : containerSelector;
    if (!customSelect) return;

    const trigger      = customSelect.querySelector('.custom-select-trigger');
    const options      = customSelect.querySelectorAll('.custom-option');
    const selectedImg  = customSelect.querySelector('.selected-icon');
    const selectedText = customSelect.querySelector('.selected-text');

    /** 更新顯示選中的選項。 */
    const setSelectedOption = (value) => {
        const targetOpt = Array.from(options).find(opt => opt.dataset.value === value)
            ?? Array.from(options).find(opt => opt.dataset.value === 'all');

        if (!targetOpt) return;
        const imgSrc = targetOpt.querySelector('img')?.src;
        const text   = targetOpt.querySelector('span')?.innerText;

        if (selectedImg  && imgSrc) selectedImg.src        = imgSrc;
        if (selectedText && text)   selectedText.innerText = text;

        options.forEach(o => o.classList.remove('selected'));
        targetOpt.classList.add('selected');
        currentSymbolValue = targetOpt.dataset.value;
    };

    setSelectedOption(currentSymbolValue);

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-select.open').forEach(el => {
            if (el !== customSelect) el.classList.remove('open');
        });
        customSelect.classList.toggle('open');
    });

    options.forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const imgSrc = opt.querySelector('img')?.src;
            const text   = opt.querySelector('span')?.innerText;

            if (selectedImg  && imgSrc) selectedImg.src        = imgSrc;
            if (selectedText && text)   selectedText.innerText = text;

            options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            currentSymbolValue = opt.dataset.value;

            customSelect.classList.remove('open');
            applyAllFilters();
            saveFilters();
            syncAllSelects();
        });
    });

    document.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target)) customSelect.classList.remove('open');
    });
}

/**
 * 初始化通用文字型自訂下拉選單（種類、機制等）。
 * @param {string|HTMLElement} containerSelector  - 容器選擇器或元素
 * @param {'type'|'mechanic'|'symbol'} storageVariableName - 對應的全域變數名稱
 */
function initSelectReplacement(containerSelector, storageVariableName) {
    const container = typeof containerSelector === 'string'
        ? document.querySelector(containerSelector)
        : containerSelector;
    if (!container) return;

    const trigger          = container.querySelector('.custom-select-trigger');
    const options          = container.querySelectorAll('.custom-option');
    const selectedTextSpan = container.querySelector('.selected-text');

    const getCurrentValue = () => {
        if (storageVariableName === 'type')    return currentTypeValue;
        if (storageVariableName === 'mechanic') return currentMechanicValue;
        return currentSymbolValue;
    };

    /** 更新選中項目的顯示文字。 */
    const setSelectedText = (value) => {
        const targetOpt = Array.from(options).find(opt => opt.dataset.value === value);
        if (targetOpt && selectedTextSpan) selectedTextSpan.innerText = targetOpt.innerText.trim();
        options.forEach(opt => opt.classList.toggle('selected', opt.dataset.value === value));
    };

    setSelectedText(getCurrentValue());

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-select.open').forEach(el => {
            if (el !== container) el.classList.remove('open');
        });
        container.classList.toggle('open');
    });

    options.forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            if (selectedTextSpan) selectedTextSpan.innerText = opt.innerText.trim();
            if (storageVariableName === 'type')    currentTypeValue     = opt.dataset.value;
            if (storageVariableName === 'mechanic') currentMechanicValue = opt.dataset.value;
            container.classList.remove('open');
            applyAllFilters();
            saveFilters();
            syncAllSelects();
        });
    });

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) container.classList.remove('open');
    });
}

/** 同步所有自訂下拉選單的顯示狀態（主介面 + 抽屜）。 */
function syncAllSelects() {
    syncFactionSelects();
    syncSymbolSelects();
    syncSelectReplacement('type');
    syncSelectReplacement('mechanic');
}

/** 同步主介面與抽屜中的教團下拉選單。 */
function syncFactionSelects() {
    const mainSelect   = document.querySelector('#factionFilter');
    const drawerSelect = document.querySelector('#drawerFaction');
    if (mainSelect)   updateFactionCustomSelect(mainSelect,   currentFactionValue);
    if (drawerSelect) updateFactionCustomSelect(drawerSelect, currentFactionValue);
}

/**
 * 更新指定教團自訂下拉的選中狀態。
 * @param {HTMLElement} customSelect - 下拉容器
 * @param {string}      value        - 目標值
 */
function updateFactionCustomSelect(customSelect, value) {
    const options      = customSelect.querySelectorAll('.custom-option');
    const selectedImg  = customSelect.querySelector('.selected-icon');
    const selectedText = customSelect.querySelector('.selected-text');
    const targetOpt    = Array.from(options).find(opt => opt.dataset.value === value);

    if (!targetOpt) return;
    if (selectedImg  && targetOpt.querySelector('img')?.src) selectedImg.src        = targetOpt.querySelector('img').src;
    if (selectedText && targetOpt.querySelector('span')?.innerText) selectedText.innerText = targetOpt.querySelector('span').innerText;

    options.forEach(o => o.classList.toggle('selected', o === targetOpt));
}

/** 同步主介面與抽屜中的符號下拉選單。 */
function syncSymbolSelects() {
    const mainSelect   = document.querySelector('#symbolFilter');
    const drawerSelect = document.querySelector('#drawerSymbol');
    if (mainSelect)   updateSymbolCustomSelect(mainSelect,   currentSymbolValue);
    if (drawerSelect) updateSymbolCustomSelect(drawerSelect, currentSymbolValue);
}

/**
 * 更新指定符號自訂下拉的選中狀態。
 * @param {HTMLElement} customSelect - 下拉容器
 * @param {string}      value        - 目標值
 */
function updateSymbolCustomSelect(customSelect, value) {
    const options      = customSelect.querySelectorAll('.custom-option');
    const selectedImg  = customSelect.querySelector('.selected-icon');
    const selectedText = customSelect.querySelector('.selected-text');
    const targetOpt    = Array.from(options).find(opt => opt.dataset.value === value);

    if (!targetOpt) return;
    if (selectedImg  && targetOpt.querySelector('img')?.src) selectedImg.src        = targetOpt.querySelector('img').src;
    if (selectedText && targetOpt.querySelector('span')?.innerText) selectedText.innerText = targetOpt.querySelector('span').innerText;

    options.forEach(o => o.classList.toggle('selected', o === targetOpt));
}

/**
 * 同步單一類型的自訂下拉選單（主介面 + 抽屜）。
 * @param {'faction'|'type'|'symbol'|'mechanic'} type - 篩選類型
 */
function syncSelectReplacement(type) {
    const config = {
        faction:  { main: '#factionFilter',  drawer: '#drawerFaction',  value: currentFactionValue  },
        type:     { main: '#typeFilter',      drawer: '#drawerType',     value: currentTypeValue     },
        symbol:   { main: '#symbolFilter',    drawer: '#drawerSymbol',   value: currentSymbolValue   },
        mechanic: { main: '#mechanicFilter',  drawer: '#drawerMechanic', value: currentMechanicValue },
    }[type];
    if (!config) return;

    const updateSelect = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return;

        const options          = el.querySelectorAll('.custom-option');
        const selectedTextSpan = el.querySelector('.selected-text');
        const targetOpt        = Array.from(options).find(opt => opt.dataset.value === config.value);

        if (targetOpt && selectedTextSpan) selectedTextSpan.innerText = targetOpt.innerText.trim();
        options.forEach(opt => opt.classList.toggle('selected', opt.dataset.value === config.value));
    };

    updateSelect(config.main);
    updateSelect(config.drawer);
}

/** 將主介面的篩選條件同步到行動端抽屜。 */
function syncDrawerFilters() {
    const drawerSearch = document.getElementById('drawerSearch');
    if (drawerSearch) drawerSearch.value = searchInput.value;
    syncFactionSelects();
    syncSymbolSelects();
    syncSelectReplacement('type');
    syncSelectReplacement('mechanic');
}

/** 將行動端抽屜的篩選條件套用至主介面並關閉抽屜。 */
function applyDrawerFilters() {
    const drawerSearch = document.getElementById('drawerSearch');
    if (drawerSearch) searchInput.value = drawerSearch.value;

    const drawerFaction  = document.querySelector('#drawerFaction .custom-option.selected');
    const drawerType     = document.querySelector('#drawerType .custom-option.selected');
    const drawerSymbol   = document.querySelector('#drawerSymbol .custom-option.selected');
    const drawerMechanic = document.querySelector('#drawerMechanic .custom-option.selected');

    if (drawerFaction)  currentFactionValue  = drawerFaction.dataset.value;
    if (drawerType)     currentTypeValue     = drawerType.dataset.value;
    if (drawerSymbol)   currentSymbolValue   = drawerSymbol.dataset.value;
    if (drawerMechanic) currentMechanicValue = drawerMechanic.dataset.value;

    updateClearSearchBtn();
    applyAllFilters();
    document.getElementById('mobileFilterDrawer')?.classList.remove('open');
    document.getElementById('drawerBackdrop')?.classList.remove('open');
}

/** QA 資料。 */
const qaData = [
    {
        category: '通用規則',
        questions: [
            {
                q: '解構中的信徒，執行儀式時是否計算其符號？',
                a: '是，解構中的信徒依然在場上。',
            },
            {
                q: '詠頌效果需計算符號的卡牌，觸發詠頌時是否計算自身符號？',
                a: '是，用回合行動打出卡牌時，會先放置到場上再觸發詠頌，故會計算自身。',
            },
            {
                q: '控訴時效果需計算符號的卡牌，結算時是否計算自身符號？',
                a: '否，控訴時會先觸發控訴時效果，才放置到場上。',
            },
            {
                q: '獻祭的卡牌，在執行儀式時是否計算其符號？',
                a: '否，獻祭的卡牌會覆蓋在儀式下，不視為在場上，無符號。',
            },
            {
                q: '效果文本中的「棄置」是玩家選擇，還是隨機？',
                a: '若文本中無註明「隨機」，即為玩家選擇。',
            },
            {
                q: '同時擁有詠頌及解構（或駐守）的信徒打出且未被控訴時，效果是否同時適用？',
                a: '是，觸發順序可由玩家自選。',
            },
            {
                q: '發動災厄效果時，在敵方控訴前是否需宣告對象？',
                a: '否，若未被控訴，於結算效果時再宣告對象即可。',
            },
            {
                q: '教主在場上時，是否視同信徒？（例如計算符號或儀式條件）',
                a: '否，教主身分並非信徒，不計入任何要求「信徒數量」的條件中。',
            },
            {
                q: '回合結束且滿足儀式條件時，是否可以選擇不執行儀式？',
                a: '是，可以選擇不執行。',
            },
            {
                q: '回合結束因牌庫為空強制執行儀式，若被控訴是否判敗？',
                a: '否，遊戲繼續進行。',
            },
            {
                q: '駐守中、解構中的信徒是否可以執行襲擊？',
                a: '是，但襲擊後會變為「罪惡」，將無法繼續保持駐守或解構狀態。',
            }
        ],
    },
    {
        category: '鴉教團',
        questions: [
            {
                q: '解構、獻祭是否可以減少《無聲奉獻》的儀式條件？',
                a: '否，《無聲奉獻》要求的是「信徒數量」而非符號數量。',
            },
            {
                q: '教主《第十三夜》在場時，若信徒詠頌被控訴，是否能觸發抽牌被動？',
                a: '否，被控訴時不會「觸發詠頌」，故不滿足抽牌條件。',
            },
            {
                q: '透過《鴉司祭》將有駐守或解構效果的信徒放置到場上，是否能使用其駐守/解構效果？',
                a: '否，除非額外文本註明，否則僅觸發詠頌效果，無法執行駐守或解構。',
            }
        ]
    },
    {
        category: '白狐神社',
        questions: [
            {
                q: '《神隱修士》、《遺忘神龕》的「完成儀式」，是否需達成原儀式的執行條件？',
                a: '否，只要滿足該卡牌自身條件且未被控訴，即可直接完成場上一個儀式。',
            }
        ]
    },
    {
        category: '瘋人院',
        questions: [
            {
                q: '棄牌區聲量2的信徒會因教主《院長》被動變為聲量3，導致無法被《院長》快速行動收回嗎？',
                a: '否，《院長》被動僅增加「控訴聲量」，不影響信徒原始聲量，故仍可收回。',
            },
            {
                q: '打出《安眠藥》時，場上有《催眠師》，效果如何結算？',
                a: '先結算《催眠師》將1個信徒拿回手（此時災厄已因星辰效果達標），再確認敵方是否控訴。',
            }
        ]
    },
    { category: '門教團',  questions: [{ q: '目前尚無特定 QA', a: '歡迎補充！' }] },
    { category: '放逐者',  questions: [{ q: '目前尚無特定 QA', a: '歡迎補充！' }] },
];

/** 渲染常見問題頁面。 */
function renderQA() {
    if (!qaSection) return;

    qaSection.innerHTML = qaData.map(cat => `
        <div class="qa-category">
            <h2 class="qa-category-title">
                <img class="qa-faction-icon" src="images/icons/${cat.category}左.png" onerror="this.style.display='none'">
                <span>${cat.category}</span>
                <img class="qa-faction-icon" src="images/icons/${cat.category}右.png" onerror="this.style.display='none'">
            </h2>
            ${cat.questions.map(qa => `
                <div class="qa-item">
                    <div class="qa-question" onclick="this.parentElement.classList.toggle('active')">
                        ${qa.q} <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="qa-answer">${qa.a}</div>
                </div>
            `).join('')}
        </div>
    `).join('');
}


/* ============================================================
 * 新手引導提示
 * ============================================================ */

/** 顯示新手引導 Toast，8 秒後自動消失。 */
function showTour() {
    const tourDiv = document.createElement('div');
    tourDiv.className = 'tour-toast';
    tourDiv.innerHTML = `
        📖 新手提示：先選規則與教團，點＋加入牌組。教主、儀式限主要教團，放逐者中立自由用。
        <button id="closeTour">知道了</button>
    `;
    document.body.appendChild(tourDiv);
    tourDiv.querySelector('#closeTour').addEventListener('click', () => tourDiv.remove());
    setTimeout(() => { if (tourDiv.parentNode) tourDiv.remove(); }, 8000);
}


/* ============================================================
 * 拖曳排序（SortableJS）
 * ============================================================ */

/** 初始化主牌組列表的拖曳排序功能。 */
function initSortable() {
    if (!slotMainList) return;

    new Sortable(slotMainList, {
        animation:    150,
        ghostClass:   'sortable-ghost',
        chosenClass:  'sortable-chosen',
        onEnd() {
            const newOrder = [];
            document.querySelectorAll('#slotMain .slot-list li').forEach(li => {
                const cardName = li.querySelector('.deck-card-name')?.innerText;
                const card     = deck.main.find(c => c.name === cardName);
                if (card) newOrder.push(card);
            });
            deck.main = newOrder;
            saveDeckData();
            document.getElementById('mainCount').innerText  = deck.main.length;
            document.getElementById('totalCount').innerText = deck.leader.length + deck.rituals.length + deck.main.length;
        },
    });
}


/* ============================================================
 * 卡牌資料載入
 * ============================================================ */

/** 從 cards.json 載入卡牌資料並初始化應用程式。 */
function fetchCards() {
    showLoading(true);

    fetch('cards.json')
        .then(res => res.json())
        .then(data => {
            mockCards = data;
            loadFilters();
            loadDeckData();
            initSortable();
            applyAllFilters();
            showLoading(false);
        })
        .catch(err => {
            console.error(err);
            showLoading(false);
            retryBtn.classList.remove('hidden');
        });
}

/** 隱藏重試按鈕並重新嘗試載入卡牌資料。 */
function retryLoadCards() {
    retryBtn.classList.add('hidden');
    fetchCards();
}


/* ============================================================
 * DOMContentLoaded — 應用程式進入點
 * ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---- 初始化自訂下拉選單 ---- */
    initFactionCustomSelect('#factionFilter');
    initFactionCustomSelect('#drawerFaction');
    initSymbolCustomSelect('#symbolFilter');
    initSymbolCustomSelect('#drawerSymbol');
    initSelectReplacement('#typeFilter',     'type');
    initSelectReplacement('#drawerType',     'type');
    initSelectReplacement('#mechanicFilter', 'mechanic');
    initSelectReplacement('#drawerMechanic', 'mechanic');

    /* ---- 載入卡牌資料 ---- */
    fetchCards();

    /* ---- Modal 左右切換按鈕 ---- */
    const prevBtn = document.getElementById('modalPrevBtn');
    const nextBtn = document.getElementById('modalNextBtn');
    prevBtn?.addEventListener('click', (e) => { e.stopPropagation(); navigateModal(-1); });
    nextBtn?.addEventListener('click', (e) => { e.stopPropagation(); navigateModal(1);  });

    /* ---- 鍵盤方向鍵切換 ---- */
    document.addEventListener('keydown', e => {
        const modal = document.getElementById('cardModal');
        if (modal?.style.display === 'flex') {
            if (e.key === 'ArrowLeft')  navigateModal(-1);
            if (e.key === 'ArrowRight') navigateModal(1);
        }
    });

    /* ---- 搜尋框 ---- */
    searchInput.addEventListener('input', () => {
        debouncedFilter();
        saveFilters();
        updateClearSearchBtn();
        syncAllSelects();
    });
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        updateClearSearchBtn();
        applyAllFilters();
    });

    /* ---- 模式切換（查牌 / 組牌 / QA） ---- */
    function switchMode(mode) {
        btnGallery.classList.toggle('active',     mode === 'gallery');
        btnDeckBuilder.classList.toggle('active', mode === 'deck');
        btnQA.classList.toggle('active',          mode === 'qa');

        cardGallerySection.classList.toggle('hidden', mode !== 'gallery');
        deckBuilderSection.classList.toggle('hidden', mode !== 'deck');
        qaSection.classList.toggle('hidden',          mode !== 'qa');

        galleryControls.style.display = (mode === 'qa') ? 'none' : 'flex';

        // 進入組牌模式且尚未套用規則時，顯示規則選擇 Modal
        if (mode === 'deck' && !currentRule.isActive) {
            document.getElementById('ruleModal').style.display = 'flex';
            syncDrawerFilters();
        }
    }
    btnGallery.addEventListener('click',      () => switchMode('gallery'));
    btnDeckBuilder.addEventListener('click',  () => switchMode('deck'));
    btnQA.addEventListener('click',           () => switchMode('qa'));

    /* ---- QA 渲染 ---- */
    renderQA();

    /* ---- 規則 Modal ---- */
    document.getElementById('pickRule1').onclick = () => {
        ruleSelect.value = 'rule1';
        secondaryFaction.classList.add('hidden');
        secondaryFaction.value = '';
        document.getElementById('ruleModal').style.display = 'none';
    };
    document.getElementById('pickRule2').onclick = () => {
        ruleSelect.value = 'rule2';
        secondaryFaction.classList.remove('hidden');
        document.getElementById('ruleModal').style.display = 'none';
    };
    ruleSelect.addEventListener('change', () => {
        const isRule2 = ruleSelect.value === 'rule2';
        secondaryFaction.classList.toggle('hidden', !isRule2);
        if (!isRule2) secondaryFaction.value = '';
    });
    primaryFaction.addEventListener('change', updateSecondaryOptions);

    btnApplyRule.addEventListener('click', () => {
        if (!primaryFaction.value)                              return showToast('⚠️ 請選擇主要教團！');
        if (ruleSelect.value === 'rule2' && !secondaryFaction.value) return showToast('⚠️ 請選擇次要教團！');
        applyRuleLogic();
        showToast('✅ 規則已套用！');
    });
    btnClearDeckOnly.addEventListener('click', () => {
        if (!confirm('⚠️ 確定要清空所有牌組內容（保留規則設定）嗎？')) return;
        deck = { leader: [], rituals: [], main: [] };
        updateDeckUI();
    });
    btnResetRule.addEventListener('click', () => {
        if (!confirm('⚠️ 確定要重置規則並清空牌組嗎？')) return;
        deck        = { leader: [], rituals: [], main: [] };
        currentRule = { isActive: false, type: 'rule1', primary: '', secondary: '' };
        ruleSelect.value       = 'rule1';
        primaryFaction.value   = '';
        secondaryFaction.value = '';
        secondaryFaction.classList.add('hidden');
        updateDeckUI();
        document.getElementById('ruleModal').style.display = 'flex';
    });

    /* ---- 隱藏已選切換 ---- */
    toggleHideCheckbox?.addEventListener('change', () => {
        hideSelected = toggleHideCheckbox.checked;
        renderDeckPool();
    });

    /* ---- 匯出 / 匯入 ---- */
    btnExportText?.addEventListener('click',  exportAsText);
    btnExportJson?.addEventListener('click',  exportAsJson);
    btnImport?.addEventListener('click',      importDeck);
    btnExportImage?.addEventListener('click', exportDeckAsImage);

    /* ---- Modal 關閉 ---- */
    closeModalBtn.onclick = () => modal.style.display = 'none';
    window.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };

    /* ---- 分區清空按鈕 ---- */
    document.querySelectorAll('.clear-category').forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.dataset.category;
            if (!confirm(`確定清空 ${cat} 區所有卡牌嗎？`)) return;
            if (cat === 'leader')  deck.leader  = [];
            if (cat === 'rituals') deck.rituals = [];
            if (cat === 'main')    deck.main    = [];
            updateDeckUI();
        });
    });

    /* ---- 行動端篩選抽屜 ---- */
    const fab        = document.getElementById('mobileFilterFab');
    const drawer     = document.getElementById('mobileFilterDrawer');
    const backdrop   = document.getElementById('drawerBackdrop');
    const closeDrawer = document.getElementById('closeDrawer');

    fab?.addEventListener('click', (e) => {
        e.stopPropagation();
        syncDrawerFilters();
        drawer.classList.add('open');
        backdrop.classList.add('open');
    });
    backdrop?.addEventListener('click', () => {
        drawer.classList.remove('open');
        backdrop.classList.remove('open');
    });
    closeDrawer?.addEventListener('click', () => {
        drawer.classList.remove('open');
        backdrop.classList.remove('open');
    });

    /* ---- Esc 關閉 Modal / 抽屜 ---- */
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (modal.style.display === 'flex') modal.style.display = 'none';
            drawer.classList.remove('open');
            backdrop.classList.remove('open');
        }
    });

    /* ---- 多牌組管理 ---- */
    document.getElementById('btnSaveDeck')?.addEventListener('click', saveCurrentDeck);
    loadAllDecks();

    /* ---- 新手引導（僅首次顯示） ---- */
    if (!localStorage.getItem('accusation_tour_shown')) {
        setTimeout(() => {
            showTour();
            localStorage.setItem('accusation_tour_shown', 'true');
        }, 1000);
    }

    /* ---- 全域函數暴露（供 HTML inline 事件使用） ---- */
    window.openModal       = openModal;
    window.addToDeck       = addToDeck;
    window.removeFromDeck  = removeFromDeck;
    window.resetAllFilters = resetAllFilters;
    window.changePage      = changePage;
    window.setPerPage      = setPerPage;
    window.handleImageError = handleImageError;
    window.retryLoadCards  = retryLoadCards;
});