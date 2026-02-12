// ----------------------------
// Data Model - Empty Start
// ----------------------------
let transactionData = JSON.parse(localStorage.getItem('transactions')) || [];

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let currentCategoryModal = null;

// Default Categories
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
        { id: 'salary', name: '월급', icon: '💵' },
        { id: 'bonus', name: '보너스', icon: '🎁' }
    ]
};

let userCategories = JSON.parse(localStorage.getItem('user_categories')) || DEFAULT_CATEGORIES;


// ----------------------------
// Initialize
// ----------------------------

export function initDashboard(user) {
    console.log("Dashboard Initialized for:", user.email);
    // You could load user-specific data here if Supabase DB was set up for transactions
    // For now, we start with empty or local data.

    // Sync Selectors
    const yearSelectOverview = document.getElementById('year-select-overview');
    const yearSelectMonth = document.getElementById('year-select-month');
    const pageTitle = document.getElementById('page-title'); // Global header title

    // ----------------------------
    // Render Functions
    // ----------------------------

    // 1. Calculate and Render Monthly Stats + Category Breakdown
    function renderMonthData(year, month) {
        // Filter data for this month
        const monthlyItems = transactionData.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === year && (d.getMonth() + 1) === month;
        });

        // Totals
        let income = 0;
        let expense = 0;
        let savings = 0;

        // Dynamic category totals
        const categoryTotals = {};
        [...userCategories.expense, ...userCategories.savings, ...userCategories.income].forEach(cat => {
            categoryTotals[cat.id] = 0;
        });

        monthlyItems.forEach(t => {
            if (t.type === 'income') income += t.amount;
            if (t.type === 'expense') expense += t.amount;
            if (t.type === 'savings') savings += t.amount;

            if (categoryTotals[t.category] !== undefined) {
                categoryTotals[t.category] += t.amount;
            }
        });

        const balance = income - expense - savings;

        // Update DOM - Summary Cards
        document.getElementById('month-income').textContent = `₩ ${income.toLocaleString()}`;
        document.getElementById('month-expense').textContent = `₩ ${expense.toLocaleString()}`;
        document.getElementById('month-balance').textContent = `₩ ${balance.toLocaleString()}`;
        document.getElementById('month-savings').textContent = `₩ ${savings.toLocaleString()}`;

        renderCategoryLists(categoryTotals);
    }

    function renderCategoryLists(totals) {
        const expenseList = document.getElementById('expense-category-list');
        const savingsList = document.getElementById('savings-category-list');

        if (expenseList) {
            expenseList.innerHTML = '';
            userCategories.expense.forEach(cat => {
                expenseList.appendChild(createCategoryCard(cat, totals[cat.id] || 0));
            });
            setupDragAndDrop('expense-category-list', 'expense');
        }

        if (savingsList) {
            savingsList.innerHTML = '';
            userCategories.savings.forEach(cat => {
                savingsList.appendChild(createCategoryCard(cat, totals[cat.id] || 0));
            });
            setupDragAndDrop('savings-category-list', 'savings');
        }
    }

    function createCategoryCard(cat, amount) {
        const card = document.createElement('div');
        card.className = 'card category-card';
        card.setAttribute('data-category', cat.id);
        card.draggable = true;

        card.innerHTML = `
            <div class="cat-header">
                <span class="icon" title="아이콘 변경">${cat.icon}</span>
                <h4>${cat.name}</h4>
                <button class="btn-delete-cat" title="삭제">&times;</button>
            </div>
            <p class="cat-amount">₩ ${amount.toLocaleString()}</p>
        `;

        // Drag events
        card.ondragstart = (e) => {
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', cat.id);
            e.dataTransfer.effectAllowed = 'move';
        };

        card.ondragend = () => {
            card.classList.remove('dragging');
        };

        // Icon click (Emoji Picker)
        const iconBtn = card.querySelector('.icon');
        iconBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent opening detail modal
            openEmojiPicker(cat.id);
        };

        // Card click (Detail View)
        card.onclick = (e) => {
            // If clicking delete button or icon, do nothing (handled by their own listeners or stopped propagation)
            if (e.target.closest('.btn-delete-cat') || e.target.closest('.icon')) return;

            renderDetailModal(cat.id);
            document.getElementById('detail-modal-overlay').classList.add('active');
        };

        // Delete button logic
        const delBtn = card.querySelector('.btn-delete-cat');
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`'${cat.name}' 카테고리를 삭제하시겠습니까? \n해당 카테고리의 모든 내역도 함께 삭제되며, 이 작업은 되돌릴 수 없습니다.`)) {
                deleteCategory(cat.id);
            }
        };

        return card;
    }

    // Drag and Drop Container Logic
    function setupDragAndDrop(containerId, categoryType) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const dragging = document.querySelector('.dragging');
            if (!dragging) return;

            const afterElement = getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                container.appendChild(dragging);
            } else {
                container.insertBefore(dragging, afterElement);
            }
        };

        container.ondrop = (e) => {
            e.preventDefault();
            const newOrder = [...container.querySelectorAll('.category-card')].map(c => c.getAttribute('data-category'));

            // Re-order the userCategories array
            const reordered = [];
            newOrder.forEach(id => {
                const cat = userCategories[categoryType].find(c => c.id === id);
                if (cat) reordered.push(cat);
            });

            userCategories[categoryType] = reordered;
            localStorage.setItem('user_categories', JSON.stringify(userCategories));
        };
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.category-card:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Emoji Picker Logic using Emoji-Mart (v5 JS API)
    let targetCategoryId = null;
    let pickerInstance = null;

    async function openEmojiPicker(catId) {
        targetCategoryId = catId;
        const container = document.getElementById('emoji-picker-container');

        if (!pickerInstance) {
            // Explicitly fetch data for stability
            try {
                const response = await fetch('https://cdn.jsdelivr.net/npm/@emoji-mart/data');
                const data = await response.json();

                pickerInstance = new EmojiMart.Picker({
                    data,
                    onEmojiSelect: (emoji) => {
                        if (targetCategoryId && emoji.native) {
                            updateCategoryIcon(targetCategoryId, emoji.native);
                            closeEmojiPicker();
                        }
                    },
                    locale: 'ko',
                    theme: 'light',
                    set: 'native'
                });
                container.appendChild(pickerInstance);
            } catch (err) {
                console.error('Emoji-Mart data load failed:', err);
                alert('이모지 데이터를 불러오지 못했습니다. 네트워크를 확인해주세요.');
                return;
            }
        }

        document.getElementById('emoji-picker-overlay').classList.add('active');
    }

    function closeEmojiPicker() {
        document.getElementById('emoji-picker-overlay').classList.remove('active');
    }

    function updateCategoryIcon(catId, newIcon) {
        let type = '';
        if (userCategories.expense.find(c => c.id === catId)) type = 'expense';
        else if (userCategories.savings.find(c => c.id === catId)) type = 'savings';
        else if (userCategories.income.find(c => c.id === catId)) type = 'income';

        if (type) {
            const cat = userCategories[type].find(c => c.id === catId);
            if (cat) {
                cat.icon = newIcon;
                localStorage.setItem('user_categories', JSON.stringify(userCategories));

                // Refresh all UI parts that might show the icon
                renderMonthData(currentYear, currentMonth);
                renderYearlyStats();
                renderRecentTransactions();

                targetCategoryId = null; // Reset
            }
        }
    }

    // Close buttons for emoji picker
    const btnEmojiClose = document.getElementById('btn-close-emoji');
    if (btnEmojiClose) btnEmojiClose.onclick = closeEmojiPicker;

    const emojiOverlay = document.getElementById('emoji-picker-overlay');
    if (emojiOverlay) {
        emojiOverlay.onclick = (e) => {
            if (e.target === emojiOverlay) closeEmojiPicker();
        };
    }


    function deleteCategory(catId) {
        // Find which list it's in
        let type = '';
        if (userCategories.expense.find(c => c.id === catId)) type = 'expense';
        else if (userCategories.savings.find(c => c.id === catId)) type = 'savings';
        else if (userCategories.income.find(c => c.id === catId)) type = 'income';

        if (type) {
            // 1. Remove category
            userCategories[type] = userCategories[type].filter(c => c.id !== catId);
            localStorage.setItem('user_categories', JSON.stringify(userCategories));

            // 2. Remove associated transactions
            transactionData = transactionData.filter(t => t.category !== catId);
            localStorage.setItem('transactions', JSON.stringify(transactionData));

            // 3. Refresh UI
            renderMonthData(currentYear, currentMonth);
            renderYearlyStats();
            renderRecentTransactions();

            // If the modal was open for this category, close it
            if (currentCategoryModal === catId) {
                document.getElementById('detail-modal-overlay').classList.remove('active');
            }
        }
    }

    function updateCategoryCard(catKey, totalAmount) {
        // Obsolete, but keeping for compatibility if referenced elsewhere temporarily
    }

    // 2. Render Recent Transactions (Top 5 Global)
    function renderRecentTransactions() {
        // Sort by date desc
        const sorted = [...transactionData].sort((a, b) => new Date(b.date) - new Date(a.date));
        const top5 = sorted.slice(0, 5);

        const listEl = document.getElementById('recent-list');
        listEl.innerHTML = '';

        if (top5.length === 0) {
            listEl.innerHTML = '<li class="no-data">데이터가 없습니다.</li>';
            return;
        }

        top5.forEach(t => {
            const li = document.createElement('li');
            li.className = 'recent-item';

            const amountClass = t.type === 'income' ? 'income' : (t.type === 'expense' ? 'expense' : 'income');
            const sign = t.type === 'expense' ? '-' : '+';
            const catName = getCategoryName(t.category);

            li.innerHTML = `
                <div class="recent-info">
                    <span class="recent-desc">${t.desc}</span>
                    <span class="recent-meta">${t.date} | ${catName}</span>
                </div>
                <span class="recent-amount ${amountClass}">${sign} ₩${t.amount.toLocaleString()}</span>
            `;
            listEl.appendChild(li);
        });
    }      // 3. Render Detail Modal Table
    function renderDetailModal(category) {
        currentCategoryModal = category;
        const modalTitle = document.getElementById('detail-modal-title');
        const tbody = document.getElementById('detail-table-body');
        const totalFooter = document.getElementById('detail-total-amount');

        const catName = getCategoryName(category);
        modalTitle.textContent = `${catName} 상세 내역`;

        const items = transactionData.filter(t => t.category === category).sort((a, b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = '';
        let total = 0;

        items.forEach(t => {
            // Sum logic: if viewing salary, sum income. If viewing expense categories, sum expense.
            if (category === 'salary') {
                if (t.type === 'income') total += t.amount;
            } else {
                if (t.type === 'expense') total += t.amount;
            }

            const className = t.type === 'expense' ? 'amount negative' : 'amount positive';

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

        totalFooter.textContent = `₩ ${total.toLocaleString()} `;
    }

    // 4. Render Yearly Stats (Overall)
    function renderYearlyStats() {
        const yearlyItems = transactionData.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === currentYear;
        });

        let income = 0;
        let expense = 0;
        let savings = 0;

        const categoryTotals = {};
        [...userCategories.expense, ...userCategories.savings, ...userCategories.income].forEach(cat => {
            categoryTotals[cat.id] = 0;
        });

        yearlyItems.forEach(t => {
            if (t.type === 'income') income += t.amount;
            if (t.type === 'expense') expense += t.amount;
            if (t.type === 'savings') savings += t.amount;

            if (categoryTotals[t.category] !== undefined) {
                categoryTotals[t.category] += t.amount;
            }
        });

        const rate = income > 0 ? Math.round((savings / income) * 100) : 0;

        document.getElementById('year-income').textContent = `₩ ${income.toLocaleString()} `;
        document.getElementById('year-expense').textContent = `₩ ${expense.toLocaleString()} `;
        document.getElementById('year-savings').textContent = `₩ ${savings.toLocaleString()} `;
        const rateEl = document.getElementById('year-rate');
        if (rateEl) rateEl.textContent = rate;

        // Update Bar Charts (Consumption only for now)
        const chartContainer = document.querySelector('.visual-placeholder.bar-chart');
        if (chartContainer) {
            chartContainer.innerHTML = '';

            // Show only expense categories in chart
            const maxExpense = Math.max(...userCategories.expense.map(c => categoryTotals[c.id]), 1);

            userCategories.expense.forEach(cat => {
                const amount = categoryTotals[cat.id] || 0;
                const pct = expense > 0 ? Math.round((amount / expense) * 100) : 0;

                const barGroup = document.createElement('div');
                barGroup.className = 'bar-group';
                barGroup.innerHTML = `
                    <div class="bar-label">${cat.name}</div>
                    <div class="bar" style="width: ${(amount / maxExpense) * 100}%"></div>
                    <div class="bar-value">${pct}%</div>
                `;
                chartContainer.appendChild(barGroup);
            });
        }
    }

    function getCategoryName(key) {
        if (!key) return '미분류';
        const all = [...userCategories.expense, ...userCategories.savings, ...userCategories.income];
        const found = all.find(c => c.id === key);
        if (found) return found.name;

        // Fallback map for legacy/default keys
        const map = {
            'salary': '월급',
            'bonus': '보너스',
            'fixed': '고정지출',
            'food': '식비',
            'other': '기타',
            'savings': '저축',
            'savings_default': '저축'
        };
        return map[key] || key;
    }


    // ----------------------------
    // Navigation & Interaction
    // ----------------------------
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.dashboard-section');

    navItems.forEach(item => {
        // Remove existing listener if any to avoid duplicates? (In module, code runs once, but init might be called multiple times if we had SPA nav)
        // For simplicity, we assume init is called ONCE per hard refresh or login flow
        item.addEventListener('click', () => {
            if (item.classList.contains('logout-btn')) return; // Skip logout btn

            navItems.forEach(nav => {
                if (!nav.classList.contains('logout-btn')) nav.classList.remove('active');
            });
            item.classList.add('active');

            const tabId = item.getAttribute('data-tab');
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(tabId === 'overview' ? 'section-overview' : 'section-month').classList.add('active');

            if (tabId === 'overview') {
                renderYearlyStats();
                pageTitle.style.display = 'block'; // Show title
                pageTitle.textContent = `${currentYear}년 전체 통계`;
            } else {
                renderMonthData(currentYear, currentMonth);
                pageTitle.style.display = 'none'; // Hide title for Monthly view as requested
            }
        });
    });

    // Month Navigation
    const displayMonth = document.getElementById('current-month-display');

    function updateMonthDisplay() {
        displayMonth.textContent = `${currentMonth} 월`;
        renderMonthData(currentYear, currentMonth);
    }

    function changeMonth(delta) {
        currentMonth += delta;
        if (currentMonth > 12) {
            currentMonth = 1;
            yearSelectMonth.value = ++currentYear;
            yearSelectOverview.value = currentYear;
        } else if (currentMonth < 1) {
            currentMonth = 12;
            yearSelectMonth.value = --currentYear;
            yearSelectOverview.value = currentYear;
        }
        updateMonthDisplay();
        renderYearlyStats(); // In case year changed
    }

    document.getElementById('btn-prev-month').onclick = () => changeMonth(-1);
    document.getElementById('btn-next-month').onclick = () => changeMonth(1);

    // Year Selection
    function changeYear(newYear) {
        currentYear = parseInt(newYear);
        yearSelectOverview.value = currentYear;
        yearSelectMonth.value = currentYear;

        // Update views
        renderYearlyStats();
        renderMonthData(currentYear, currentMonth);

        // Update Title if in Overview
        if (document.getElementById('section-overview').classList.contains('active')) {
            pageTitle.textContent = `${currentYear}년 전체 통계`;
        }
    }

    yearSelectOverview.onchange = (e) => changeYear(e.target.value);
    yearSelectMonth.onchange = (e) => changeYear(e.target.value);

    // --- Salary Card Click (Event Delegation) ---
    // Ensure we don't add multiple listeners if init called multiple times.
    // Better to just set it once on document if possible, but here we scope to function.
    // Since we are in module, this script executes once. initDashboard calls inner setup.
    // Event listeners on document will accumulate if initDashboard called multiple times.
    // For now, we assume page reload or single login per session.

    document.addEventListener('click', (e) => {
        const salaryCard = e.target.closest('#card-salary');
        if (salaryCard) {
            renderDetailModal('salary');
            document.getElementById('detail-modal-overlay').classList.add('active');
        }
    });

    // --- Add Category Buttons ---
    document.querySelectorAll('.btn-add-category').forEach(btn => {
        btn.onclick = (e) => {
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
                localStorage.setItem('user_categories', JSON.stringify(userCategories));
                renderMonthData(currentYear, currentMonth);
                updateSelectDropdowns(); // Update transaction modal dropdowns
            }
        };
    });

    function updateSelectDropdowns() {
        const selects = document.querySelectorAll('#transaction-form select, #qa-category-select'); // if it existed
        // We'll update the main modal dropdown based on type logic below
    }

    // --- Category Dropdown Logic ---
    const typeRadios = document.querySelectorAll('input[name="type"]');
    const categorySelect = document.querySelector('#transaction-form select');

    function updateCategoryOptions(type) {
        if (!categorySelect) return;
        categorySelect.innerHTML = '';

        let cats = [];
        if (type === 'income') cats = userCategories.income;
        else if (type === 'expense') cats = userCategories.expense;
        else if (type === 'savings') cats = userCategories.savings;

        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            categorySelect.appendChild(opt);
        });
    }

    typeRadios.forEach(radio => {
        radio.onchange = () => updateCategoryOptions(radio.value);
    });
    // Initial call
    updateCategoryOptions('expense');


    // --- Detail Modal Controls ---
    const detailOverlay = document.getElementById('detail-modal-overlay');
    document.getElementById('btn-close-detail').onclick = () => {
        detailOverlay.classList.remove('active');
    };

    detailOverlay.onclick = (e) => {
        if (e.target === detailOverlay) detailOverlay.classList.remove('active');
    };

    // --- Quick Add inside Detail Modal ---
    document.getElementById('btn-quick-add').onclick = () => {
        if (!currentCategoryModal) return;

        const date = document.getElementById('qa-date').value;
        const desc = document.getElementById('qa-desc').value;
        const amount = parseInt(document.getElementById('qa-amount').value);

        if (!date || !amount) {
            alert('날짜와 금액을 입력해주세요.');
            return;
        }

        const type = (currentCategoryModal === 'salary') ? 'income' : 'expense';

        const newTx = {
            id: Date.now(),
            date: date,
            type: type,
            category: currentCategoryModal,
            amount: amount,
            desc: desc
        };

        transactionData.push(newTx);

        // 🔥 이 줄 추가
        localStorage.setItem('transactions', JSON.stringify(transactionData));

        renderDetailModal(currentCategoryModal);
        renderMonthData(currentYear, currentMonth);
        renderYearlyStats();
        renderRecentTransactions();

        document.getElementById('qa-desc').value = '';
        document.getElementById('qa-amount').value = '';
    };

    // --- Global Add Transaction Modal ---
    // --- Global Add Transaction Modal ---
    const formTransaction = document.getElementById('transaction-form');
    // Remove previous listener to be safe? 
    // Clone and replace to strip listeners is a hack.
    // For now, simpler: we assume init is called once.
    formTransaction.onsubmit = (e) => {
        e.preventDefault();

        const idInput = document.getElementById('edit-id');
        const editId = idInput.value ? parseInt(idInput.value) : null;

        const date = formTransaction.querySelector('input[type="date"]').value;
        const type = formTransaction.querySelector('input[name="type"]:checked').value;
        const category = formTransaction.querySelector('select').value;
        const amount = parseInt(formTransaction.querySelector('input[type="number"]').value);
        const desc = formTransaction.querySelector('input[type="text"]').value;

        if (editId) {
            // Update existing
            const idx = transactionData.findIndex(t => t.id === editId);
            if (idx > -1) {
                transactionData[idx] = { ...transactionData[idx], date, type, category, amount, desc };
            }
        } else {
            // Create new
            transactionData.push({
                id: Date.now(),
                date: date,
                type: type,
                category: category,
                amount: amount,
                desc: desc
            });
        }

        // Save to LocalStorage
        localStorage.setItem('transactions', JSON.stringify(transactionData));

        alert('저장되었습니다.');
        document.getElementById('modal-overlay').classList.remove('active');
        formTransaction.reset();
        if (idInput) idInput.value = ''; // Clear ID

        renderMonthData(currentYear, currentMonth);
        renderYearlyStats();
        renderRecentTransactions();

        // If modal was open, refresh it
        if (currentCategoryModal && document.getElementById('detail-modal-overlay').classList.contains('active')) {
            renderDetailModal(currentCategoryModal);
        }
    };

    document.getElementById('btn-add-transaction').onclick = () => {
        document.getElementById('edit-id').value = ''; // Clear ID for new
        formTransaction.reset();
        document.getElementById('modal-overlay').classList.add('active');
    };
    document.getElementById('btn-close-modal').onclick = () => {
        document.getElementById('modal-overlay').classList.remove('active');
    };


    // --- Global Init ---
    function init() {
        // Sync UI with current date
        yearSelectOverview.value = currentYear;
        yearSelectMonth.value = currentYear;
        updateMonthDisplay();

        renderYearlyStats();
        // renderMonthData is called by updateMonthDisplay
        renderRecentTransactions();
    }

    init();

    // Export delete function
    window.deleteTransaction = function (id) {
        if (confirm('삭제하시겠습니까?')) {
            const idx = transactionData.findIndex(t => t.id === id);
            if (idx > -1) {
                transactionData.splice(idx, 1);
                localStorage.setItem('transactions', JSON.stringify(transactionData)); // Save
                renderDetailModal(currentCategoryModal);
                renderMonthData(currentYear, currentMonth);
                renderYearlyStats();
                renderRecentTransactions();
            }
        }
    };

    // Export edit function
    window.editTransaction = function (id) {
        const item = transactionData.find(t => t.id === id);
        if (!item) return;

        // Close detail modal first if preferred, or layer on top. 
        // Layering standard modal on top of large modal might require z-index adjustment.
        // For simplicity, let's just open the modal.

        const form = document.getElementById('transaction-form');
        document.getElementById('edit-id').value = item.id;
        form.querySelector('input[type="date"]').value = item.date;

        // Radio
        const radios = form.querySelectorAll('input[name="type"]');
        radios.forEach(r => {
            if (r.value === item.type) r.checked = true;
        });

        form.querySelector('select').value = item.category;
        form.querySelector('input[type="number"]').value = item.amount;
        form.querySelector('input[type="text"]').value = item.desc;

        document.getElementById('modal-overlay').classList.add('active');
    };
}
