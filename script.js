
import { supabase } from "./supabase.js";

// ----------------------------
// Data Model - State
// ----------------------------
let transactionData = []; // Fetched from DB
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let currentCategoryModal = null;

// Default Categories (Initial state for new users)
const DEFAULT_CATEGORIES = {
    expense: [
        { id: 'fixed', name: '고정지출', icon: '🏠' },
        { id: 'food', name: '식비', icon: '🍚' },
        { id: 'other', name: '기타', icon: '🎸' }
    ],
    savings: [
        { id: 'savings_default', name: '저축', icon: '💰' }
    ],
    income: [
        { id: 'income_default', name: '수입', icon: '💰' }
    ]
};

let userCategories = { ...DEFAULT_CATEGORIES };

// ----------------------------
// Initialize Dashboard
// ----------------------------
export async function initDashboard(user) {
    console.log("[Dashboard] Initializing Dashboard Logic for:", user.email);
    console.time("DashboardInit");

    const yearSelectOverview = document.getElementById('year-select-overview');
    const yearSelectMonth = document.getElementById('year-select-month');
    const pageTitle = document.getElementById('page-title');
    const displayMonth = document.getElementById('current-month-display');
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.dashboard-section');

    // ----------------------------
    // UI Event Listeners (Attach FIRST for responsiveness)
    // ----------------------------

    function updateMonthDisplay() {
        if (displayMonth) displayMonth.textContent = `${currentMonth} 월`;
        renderMonthData(currentYear, currentMonth);
    }

    function changeMonth(delta) {
        currentMonth += delta;
        if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        } else if (currentMonth < 1) {
            currentMonth = 12;
            currentYear--;
        }
        if (yearSelectMonth) yearSelectMonth.value = currentYear;
        if (yearSelectOverview) yearSelectOverview.value = currentYear;
        updateMonthDisplay();
        renderYearlyStats();
    }

    function changeYear(newYear) {
        currentYear = parseInt(newYear);
        if (yearSelectOverview) yearSelectOverview.value = currentYear;
        if (yearSelectMonth) yearSelectMonth.value = currentYear;
        renderYearlyStats();
        renderMonthData(currentYear, currentMonth);
        if (document.getElementById('section-overview').classList.contains('active')) {
            pageTitle.textContent = `${currentYear}년 전체 통계`;
        }
    }

    // Tabs
    navItems.forEach(item => {
        item.onclick = () => {
            if (item.classList.contains('logout-btn')) return;
            navItems.forEach(nav => { if (!nav.classList.contains('logout-btn')) nav.classList.remove('active'); });
            item.classList.add('active');
            const tabId = item.getAttribute('data-tab');
            sections.forEach(section => section.classList.remove('active'));
            const targetSection = document.getElementById(tabId === 'overview' ? 'section-overview' : 'section-month');
            if (targetSection) targetSection.classList.add('active');

            if (tabId === 'overview') {
                renderYearlyStats();
                pageTitle.style.display = 'block';
                pageTitle.textContent = `${currentYear}년 전체 통계`;
            } else {
                renderMonthData(currentYear, currentMonth);
                pageTitle.style.display = 'none';
            }
        };
    });

    // Navigation Buttons
    const btnPrev = document.getElementById('btn-prev-month');
    const btnNext = document.getElementById('btn-next-month');
    if (btnPrev) btnPrev.onclick = () => changeMonth(-1);
    if (btnNext) btnNext.onclick = () => changeMonth(1);

    if (yearSelectOverview) yearSelectOverview.onchange = (e) => changeYear(e.target.value);
    if (yearSelectMonth) yearSelectMonth.onchange = (e) => changeYear(e.target.value);

    // Initial value sync
    if (yearSelectOverview) yearSelectOverview.value = currentYear;
    if (yearSelectMonth) yearSelectMonth.value = currentYear;
    if (displayMonth) displayMonth.textContent = `${currentMonth} 월`;

    // --- Detail Modal Controls ---
    const detailOverlay = document.getElementById('detail-modal-overlay');
    const btnCloseDetail = document.getElementById('btn-close-detail');
    if (btnCloseDetail) btnCloseDetail.onclick = () => detailOverlay.classList.remove('active');
    if (detailOverlay) {
        detailOverlay.onclick = (e) => {
            if (e.target === detailOverlay) detailOverlay.classList.remove('active');
        };
    }

    // --- Income Card Click (Event Delegation) ---
    document.addEventListener('click', (e) => {
        const incomeCard = e.target.closest('#card-income');
        if (incomeCard) {
            document.getElementById('qa-date').value = '';
            document.getElementById('qa-desc').value = '';
            document.getElementById('qa-amount').value = '';
            renderDetailModal('income_default');
            detailOverlay.classList.add('active');
        }
    });

    const btnQuickAdd = document.getElementById('btn-quick-add');
    if (btnQuickAdd) {
        btnQuickAdd.onclick = async () => {
            console.log("[QuickAdd] Clicked! Modal Category:", currentCategoryModal);
            try {
                if (!currentCategoryModal) return;
                const date = document.getElementById('qa-date').value;
                const desc = document.getElementById('qa-desc').value;
                const amountStr = document.getElementById('qa-amount').value;
                const amount = parseInt(amountStr);

                if (!date || !amount || isNaN(amount)) {
                    alert('날짜와 금액을 모두 입력해주세요.');
                    return;
                }

                let type = 'expense';
                if (userCategories.income.some(c => c.id === currentCategoryModal) || currentCategoryModal === 'income_default') {
                    type = 'income';
                } else if (userCategories.savings.some(c => c.id === currentCategoryModal) || currentCategoryModal === 'savings_default') {
                    type = 'savings';
                }

                const newTx = {
                    user_id: user.id,
                    date: date,
                    type: type,
                    category: currentCategoryModal,
                    amount: amount,
                    desc: desc || ''
                };

                console.log("[QuickAdd] Attempting Supabase insert...", newTx);
                const { data: insertRes, error } = await supabase.from('transactions').insert(newTx).select();

                if (error) {
                    console.error("[QuickAdd] Insert ERROR:", error);
                    throw error;
                }

                console.log("[QuickAdd] Insert SUCCESS! Response:", insertRes);

                // Add to local data (with the ID returned from DB)
                if (insertRes && insertRes[0]) {
                    newTx.id = insertRes[0].id;
                    transactionData.push(newTx);
                } else {
                    // Fallback if select failing but insert worked
                    newTx.id = Date.now();
                    transactionData.push(newTx);
                }

                alert('저장되었습니다!');

                renderDetailModal(currentCategoryModal);
                renderMonthData(currentYear, currentMonth);
                renderYearlyStats();
                renderRecentTransactions();

                document.getElementById('qa-desc').value = '';
                document.getElementById('qa-amount').value = '';

                const dParts = date.split('-');
                if (dParts.length >= 2) {
                    const txYear = parseInt(dParts[0]);
                    const txMonth = parseInt(dParts[1]);
                    if (txYear !== currentYear || txMonth !== currentMonth) {
                        alert(`알림: ${txYear}년 ${txMonth}월 내역으로 저장되었습니다.\n(현재 화면은 ${currentYear}년 ${currentMonth}월입니다)`);
                    }
                }
            } catch (err) {
                console.error("Quick add failed:", err);
                alert("저장 중 오류가 발생했습니다: " + err.message);
            }
        };
    }

    // --- Global Add Transaction Modal ---
    const formTransaction = document.getElementById('transaction-form');
    if (formTransaction) {
        formTransaction.onsubmit = async (e) => {
            e.preventDefault();
            const idInput = document.getElementById('edit-id');
            const editId = idInput.value ? parseInt(idInput.value) : null;
            const date = formTransaction.querySelector('input[type="date"]').value;
            const type = formTransaction.querySelector('input[name="type"]:checked').value;
            const category = formTransaction.querySelector('select').value;
            const amount = parseInt(formTransaction.querySelector('input[type="number"]').value);
            const desc = formTransaction.querySelector('input[type="text"]').value;

            try {
                if (editId) {
                    const updated = { date, type, category, amount, desc };
                    const { error } = await supabase.from('transactions').update(updated).eq('id', editId);
                    if (error) throw error;
                    const idx = transactionData.findIndex(t => t.id === editId);
                    if (idx > -1) transactionData[idx] = { ...transactionData[idx], ...updated };
                } else {
                    const newTx = { id: Date.now(), user_id: user.id, date, type, category, amount, desc };
                    const { error } = await supabase.from('transactions').insert(newTx);
                    if (error) throw error;
                    transactionData.push(newTx);
                }
                alert('저장되었습니다.');
                document.getElementById('modal-overlay').classList.remove('active');
                formTransaction.reset();
                if (idInput) idInput.value = '';
                renderMonthData(currentYear, currentMonth);
                renderYearlyStats();
                renderRecentTransactions();
                if (currentCategoryModal && detailOverlay.classList.contains('active')) {
                    renderDetailModal(currentCategoryModal);
                }
            } catch (err) {
                console.error("Save failed:", err);
                alert("저장 실패: " + err.message);
            }
        };
    }

    const btnAddTransaction = document.getElementById('btn-add-transaction');
    if (btnAddTransaction) {
        btnAddTransaction.onclick = () => {
            document.getElementById('edit-id').value = '';
            formTransaction.reset();
            document.getElementById('modal-overlay').classList.add('active');
        };
    }
    const btnCloseModal = document.getElementById('btn-close-modal');
    if (btnCloseModal) btnCloseModal.onclick = () => document.getElementById('modal-overlay').classList.remove('active');

    // --- Add Category Buttons ---
    document.querySelectorAll('.btn-add-category').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            const type = btn.getAttribute('data-type');
            const name = prompt(`${type === 'expense' ? '소비' : '저축'} 카테고리 이름을 입력하세요:`);
            if (name && name.trim()) {
                const newCat = {
                    id: `custom_${Date.now()}`,
                    name: name.trim(),
                    icon: type === 'expense' ? '💸' : '📈'
                };
                userCategories[type].push(newCat);
                const { error } = await supabase.from('user_categories').update({ [type]: userCategories[type] }).eq('user_id', user.id);
                if (error) alert('카테고리 저장 실패: ' + error.message);
                renderMonthData(currentYear, currentMonth);
                updateCategoryOptions(document.querySelector('input[name="type"]:checked').value);
            }
        };
    });

    const typeRadios = document.querySelectorAll('input[name="type"]');
    typeRadios.forEach(radio => {
        radio.onchange = () => updateCategoryOptions(radio.value);
    });

    // ----------------------------
    // Fetch Data from Supabase (Async & Parallel)
    // ----------------------------
    const syncData = async () => {
        console.log("[Dashboard] Starting data sync for user.id:", user.id);
        const withTimeout = (promise, ms = 15000) => {
            return Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
            ]);
        };

        try {
            const [catResult, txResult] = await Promise.allSettled([
                withTimeout(supabase.from('user_categories').select('*').eq('user_id', user.id).maybeSingle()),
                withTimeout(supabase.from('transactions').select('*').eq('user_id', user.id))
            ]);

            // Process Categories
            if (catResult.status === 'fulfilled' && !catResult.value.error) {
                const catData = catResult.value.data;
                if (catData) {
                    console.log("[Dashboard] Categories synced.");
                    userCategories = {
                        expense: catData.expense || DEFAULT_CATEGORIES.expense,
                        income: catData.income || DEFAULT_CATEGORIES.income,
                        savings: catData.savings || DEFAULT_CATEGORIES.savings
                    };
                } else {
                    console.log("[Dashboard] No categories found, creating defaults...");
                    await supabase.from('user_categories').insert({
                        user_id: user.id,
                        expense: DEFAULT_CATEGORIES.expense,
                        income: DEFAULT_CATEGORIES.income,
                        savings: DEFAULT_CATEGORIES.savings
                    });
                    userCategories = { ...DEFAULT_CATEGORIES };
                }
            } else {
                console.warn("[Dashboard] Category sync failed or timed out. Using current/default.");
                if (!userCategories) userCategories = { ...DEFAULT_CATEGORIES };
            }

            // Process Transactions
            if (txResult.status === 'fulfilled' && !txResult.value.error) {
                const txData = txResult.value.data;
                console.log(`[Dashboard] ${txData?.length || 0} Transactions synced.`);
                if (txData) transactionData = txData;
            } else {
                console.warn("[Dashboard] Transaction sync failed or timed out.");
            }

            // Always render what we have
            renderMonthData(currentYear, currentMonth);
            renderYearlyStats();
            renderRecentTransactions();
            updateCategoryOptions('expense');
            console.log("[Dashboard] Sync complete.");

        } catch (err) {
            console.error("[Dashboard] CRITICAL Sync error:", err);
        }
    };

    // Attach Sync Button
    const btnSync = document.getElementById('btn-sync-data');
    if (btnSync) btnSync.onclick = () => syncData();

    // Initial Load
    await syncData();

    // ----------------------------
    // Render Functions (Defined in scope)
    // ----------------------------

    function renderMonthData(year, month) {
        const monthlyItems = transactionData.filter(t => {
            if (!t.date) return false;
            const parts = t.date.trim().split(/[-/]/);
            if (parts.length < 2) return false;
            return parseInt(parts[0]) === Number(year) && parseInt(parts[1]) === Number(month);
        });

        let income = 0, expense = 0, savings = 0;
        const categoryTotals = {};
        [...userCategories.expense, ...userCategories.savings, ...userCategories.income].forEach(cat => {
            categoryTotals[cat.id] = 0;
        });

        monthlyItems.forEach(t => {
            if (t.type === 'income') income += t.amount;
            if (t.type === 'expense') expense += t.amount;
            if (t.type === 'savings') savings += t.amount;
            if (categoryTotals[t.category] !== undefined) categoryTotals[t.category] += t.amount;
        });

        document.getElementById('month-income').textContent = `₩ ${income.toLocaleString()}`;
        document.getElementById('month-expense').textContent = `₩ ${expense.toLocaleString()}`;
        document.getElementById('month-balance').textContent = `₩ ${(income - expense - savings).toLocaleString()}`;
        document.getElementById('month-savings').textContent = `₩ ${savings.toLocaleString()}`;

        renderCategoryLists(categoryTotals);
    }

    function renderCategoryLists(totals) {
        ['income', 'expense', 'savings'].forEach(type => {
            const listEl = document.getElementById(`${type}-category-list`);
            if (listEl) {
                listEl.innerHTML = '';
                userCategories[type].forEach(cat => {
                    listEl.appendChild(createCategoryCard(cat, totals[cat.id] || 0, type));
                });
                setupDragAndDrop(`${type}-category-list`, type);
            }
        });
    }

    function createCategoryCard(cat, amount, categoryType) {
        const card = document.createElement('div');
        card.className = 'card category-card';
        card.setAttribute('data-category', cat.id);
        card.setAttribute('data-type', categoryType);
        card.draggable = true;

        card.innerHTML = `
            <div class="cat-header">
                <span class="icon">${cat.icon}</span>
                <h4>${cat.name}</h4>
                <button class="btn-delete-cat">&times;</button>
            </div>
            <p class="cat-amount">₩ ${amount.toLocaleString()}</p>
        `;

        card.ondragstart = (e) => { card.classList.add('dragging'); e.dataTransfer.setData('text/plain', cat.id); };
        card.ondragend = () => card.classList.remove('dragging');

        card.querySelector('.icon').onclick = (e) => { e.stopPropagation(); openEmojiPicker(cat.id); };
        card.onclick = (e) => {
            if (e.target.closest('.btn-delete-cat') || e.target.closest('.icon')) return;
            document.getElementById('qa-date').value = '';
            document.getElementById('qa-desc').value = '';
            document.getElementById('qa-amount').value = '';
            renderDetailModal(cat.id);
            detailOverlay.classList.add('active');
        };

        card.querySelector('.btn-delete-cat').onclick = (e) => {
            e.stopPropagation();
            if (confirm(`'${cat.name}' 카테고리를 삭제하시겠습니까?`)) deleteCategory(cat.id);
        };

        return card;
    }

    function renderDetailModal(category) {
        currentCategoryModal = category;
        const modalTitle = document.getElementById('detail-modal-title');
        const tbody = document.getElementById('detail-table-body');
        const footerLabel = document.querySelector('.total-display span:first-child');
        const totalFooter = document.getElementById('detail-total-amount');

        modalTitle.textContent = `${getCategoryName(category)} 상세 내역`;

        const items = transactionData.filter(t => {
            if (!t.date || t.category !== category) return false;
            const parts = t.date.trim().split(/[-/]/);
            return parseInt(parts[0]) === Number(currentYear) && parseInt(parts[1]) === Number(currentMonth);
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = '';
        let total = 0;
        let cType = 'expense';
        if (userCategories.income.some(c => c.id === category)) cType = 'income';
        else if (userCategories.savings.some(c => c.id === category)) cType = 'savings';

        footerLabel.textContent = cType === 'income' ? '총 수입:' : (cType === 'savings' ? '총 저축:' : '총 지출:');

        items.forEach(t => {
            total += t.amount;
            const className = t.type === 'expense' ? 'amount negative' : (t.type === 'savings' ? 'amount savings' : 'amount positive');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${t.date}</td>
                <td>${t.desc}</td>
                <td class="${className}">₩ ${t.amount.toLocaleString()}</td>
                <td>
                    <button class="btn-edit" onclick="editTransaction(${t.id})">수정</button>
                    <span style="color: #ccc; margin: 0 4px;">/</span>
                    <button class="btn-delete" onclick="deleteTransaction(${t.id})">삭제</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        totalFooter.textContent = `₩ ${total.toLocaleString()}`;
    }

    function renderYearlyStats() {
        const yearlyItems = transactionData.filter(t => {
            if (!t.date) return false;
            return parseInt(t.date.split(/[-/]/)[0]) === Number(currentYear);
        });

        let inc = 0, exp = 0, sav = 0;
        const totals = {};
        [...userCategories.expense, ...userCategories.savings, ...userCategories.income].forEach(cat => totals[cat.id] = 0);

        yearlyItems.forEach(t => {
            if (t.type === 'income') inc += t.amount;
            if (t.type === 'expense') exp += t.amount;
            if (t.type === 'savings') sav += t.amount;
            if (totals[t.category] !== undefined) totals[t.category] += t.amount;
        });

        document.getElementById('year-income').textContent = `₩ ${inc.toLocaleString()}`;
        document.getElementById('year-expense').textContent = `₩ ${exp.toLocaleString()}`;
        document.getElementById('year-savings').textContent = `₩ ${sav.toLocaleString()}`;
        const rateEl = document.getElementById('year-rate');
        if (rateEl) rateEl.textContent = inc > 0 ? Math.round((sav / inc) * 100) : 0;

        const expenseData = userCategories.expense.map(c => ({ name: c.name, amount: totals[c.id] || 0 })).filter(d => d.amount > 0);
        const savingsData = userCategories.savings.map(c => ({ name: c.name, amount: totals[c.id] || 0 })).filter(d => d.amount > 0);

        renderPieChart('expense-pie-chart', 'expense-pie-legend', expenseData, exp);
        renderPieChart('savings-pie-chart', 'savings-pie-legend', savingsData, sav);
    }

    const CHART_COLORS = ['#4318FF', '#6AD2FF', '#2B3674', '#FFB547', '#01B574', '#8A8D93', '#EC407A', '#AB47BC', '#7E57C2', '#26A69A'];

    function renderPieChart(chartId, legendId, data, total) {
        const chartEl = document.getElementById(chartId);
        const legendEl = document.getElementById(legendId);
        if (!chartEl || !legendEl) return;
        legendEl.innerHTML = '';
        if (total === 0 || data.length === 0) {
            chartEl.style.background = '#f0f0f0';
            legendEl.innerHTML = '<li>데이터 없음</li>';
            return;
        }
        let currentPct = 0;
        const gradientParts = [];
        data.sort((a, b) => b.amount - a.amount).forEach((item, i) => {
            const pct = (item.amount / total) * 100;
            const color = CHART_COLORS[i % CHART_COLORS.length];
            gradientParts.push(`${color} ${currentPct}% ${currentPct + pct}%`);
            const li = document.createElement('div');
            li.className = 'legend-item';
            li.innerHTML = `<div class="legend-left"><div class="color-box" style="background:${color}"></div><span>${item.name}</span></div>
                            <div class="legend-right"><span>₩${item.amount.toLocaleString()}</span><span class="legend-pct">(${Math.round(pct)}%)</span></div>`;
            legendEl.appendChild(li);
            currentPct += pct;
        });
        chartEl.style.background = `conic-gradient(${gradientParts.join(', ')})`;
    }

    function renderRecentTransactions() {
        const sorted = [...transactionData].sort((a, b) => new Date(b.date) - new Date(a.date));
        const listEl = document.getElementById('recent-list');
        if (!listEl) return;
        listEl.innerHTML = sorted.length === 0 ? '<li class="no-data">데이터 없음</li>' : '';
        sorted.slice(0, 5).forEach(t => {
            const li = document.createElement('li');
            li.className = 'recent-item';
            const aClass = t.type === 'income' ? 'income' : (t.type === 'expense' ? 'expense' : 'income');
            li.innerHTML = `<div class="recent-info"><span class="recent-desc">${t.desc}</span><span class="recent-meta">${t.date} | ${getCategoryName(t.category)}</span></div>
                            <span class="recent-amount ${aClass}">${t.type === 'expense' ? '-' : '+'} ₩${t.amount.toLocaleString()}</span>`;
            listEl.appendChild(li);
        });
    }

    function getCategoryName(key) {
        const all = [...userCategories.expense, ...userCategories.savings, ...userCategories.income];
        const found = all.find(c => c.id === key);
        if (found) return found.name;
        const map = { 'income_default': '수입', 'savings_default': '저축', 'fixed': '고정지출', 'food': '식비', 'other': '기타' };
        return map[key] || key;
    }

    function updateCategoryOptions(type) {
        const select = document.querySelector('#transaction-form select');
        if (!select) return;
        select.innerHTML = '';
        (userCategories[type] || []).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            select.appendChild(opt);
        });
    }

    // Emoji Picker
    let targetCategoryId = null;
    let pickerInstance = null;
    async function openEmojiPicker(catId) {
        targetCategoryId = catId;
        const container = document.getElementById('emoji-picker-container');
        if (!pickerInstance) {
            const res = await fetch('https://cdn.jsdelivr.net/npm/@emoji-mart/data');
            const data = await res.json();
            pickerInstance = new EmojiMart.Picker({
                data,
                onEmojiSelect: (emoji) => {
                    if (targetCategoryId && emoji.native) {
                        updateCategoryIcon(targetCategoryId, emoji.native);
                        document.getElementById('emoji-picker-overlay').classList.remove('active');
                    }
                },
                locale: 'ko', theme: 'light'
            });
            container.appendChild(pickerInstance);
        }
        document.getElementById('emoji-picker-overlay').classList.add('active');
    }

    function updateCategoryIcon(catId, newIcon) {
        ['expense', 'savings', 'income'].forEach(type => {
            const cat = userCategories[type].find(c => c.id === catId);
            if (cat) {
                cat.icon = newIcon;
                supabase.from('user_categories').update({ [type]: userCategories[type] }).eq('user_id', user.id).then(() => {
                    renderMonthData(currentYear, currentMonth);
                    renderYearlyStats();
                    renderRecentTransactions();
                });
            }
        });
    }

    const btnEmojiClose = document.getElementById('btn-close-emoji');
    if (btnEmojiClose) btnEmojiClose.onclick = () => document.getElementById('emoji-picker-overlay').classList.remove('active');

    function deleteCategory(catId) {
        ['expense', 'savings', 'income'].forEach(type => {
            if (userCategories[type].some(c => c.id === catId)) {
                userCategories[type] = userCategories[type].filter(c => c.id !== catId);
                supabase.from('user_categories').update({ [type]: userCategories[type] }).eq('user_id', user.id).then(() => {
                    transactionData = transactionData.filter(t => t.category !== catId);
                    renderMonthData(currentYear, currentMonth);
                    renderYearlyStats();
                    renderRecentTransactions();
                    if (currentCategoryModal === catId) detailOverlay.classList.remove('active');
                });
            }
        });
    }

    function setupDragAndDrop(containerId, type) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.ondragover = (e) => {
            const dragging = document.querySelector('.dragging');
            if (!dragging || dragging.getAttribute('data-type') !== type) return;
            e.preventDefault();
            const after = getDragAfterElement(container, e.clientY);
            if (after == null) container.appendChild(dragging);
            else container.insertBefore(dragging, after);
        };
        container.ondrop = (e) => {
            e.preventDefault();
            const newOrder = [...container.querySelectorAll('.category-card')].map(c => c.getAttribute('data-category'));
            userCategories[type] = newOrder.map(id => userCategories[type].find(c => c.id === id)).filter(Boolean);
            supabase.from('user_categories').update({ [type]: userCategories[type] }).eq('user_id', user.id);
        };
    }

    function getDragAfterElement(c, y) {
        const draggables = [...c.querySelectorAll('.category-card:not(.dragging)')];
        return draggables.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset, element: child };
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Export window functions
    window.deleteTransaction = async (id) => {
        if (confirm('삭제하시겠습니까?')) {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) { alert('삭제 실패'); return; }
            transactionData = transactionData.filter(t => t.id !== id);
            renderDetailModal(currentCategoryModal);
            renderMonthData(currentYear, currentMonth);
            renderYearlyStats();
            renderRecentTransactions();
        }
    };

    window.editTransaction = (id) => {
        const item = transactionData.find(t => t.id === id);
        if (!item) return;
        const form = document.getElementById('transaction-form');
        document.getElementById('edit-id').value = item.id;
        form.querySelector('input[type="date"]').value = item.date;
        form.querySelectorAll('input[name="type"]').forEach(r => { if (r.value === item.type) r.checked = true; });
        updateCategoryOptions(item.type);
        form.querySelector('select').value = item.category;
        form.querySelector('input[type="number"]').value = item.amount;
        form.querySelector('input[type="text"]').value = item.desc;
        document.getElementById('modal-overlay').classList.add('active');
    };
}
