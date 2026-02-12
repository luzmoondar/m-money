// ----------------------------
// Data Model - Empty Start
// ----------------------------
let transactionData = JSON.parse(localStorage.getItem('transactions')) || [];

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let currentCategoryModal = null; // Current category open in detail modal

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
        let fixed = 0;
        let food = 0;
        let other = 0;

        monthlyItems.forEach(t => {
            if (t.type === 'income') income += t.amount;
            if (t.type === 'expense') {
                expense += t.amount;
                if (t.category === 'fixed') fixed += t.amount;
                else if (t.category === 'food') food += t.amount;
                else if (t.category === 'other') other += t.amount;
            }
            if (t.type === 'savings') savings += t.amount;
        });

        const balance = income - expense - savings;

        // Update DOM - Summary Cards
        document.getElementById('month-income').textContent = `₩ ${income.toLocaleString()}`;
        document.getElementById('month-expense').textContent = `₩ ${expense.toLocaleString()}`;
        document.getElementById('month-balance').textContent = `₩ ${balance.toLocaleString()}`;
        document.getElementById('month-savings').textContent = `₩ ${savings.toLocaleString()}`;

        // Update DOM - Category Breakdown
        updateCategoryCard('fixed', fixed);
        updateCategoryCard('food', food);
        updateCategoryCard('other', other);
    }

    function updateCategoryCard(catKey, totalAmount) {
        // Total Amount
        const amtEl = document.getElementById(`amt-${catKey}`);
        if (amtEl) amtEl.textContent = `₩ ${totalAmount.toLocaleString()}`;
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
    }

    // 3. Render Detail Modal Table
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
        // Aggregate data for currentYear
        const yearlyItems = transactionData.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === currentYear;
        });

        let income = 0;
        let expense = 0;
        let savings = 0;
        let fixed = 0;
        let food = 0;
        let other = 0;

        yearlyItems.forEach(t => {
            if (t.type === 'income') income += t.amount;
            if (t.type === 'expense') {
                expense += t.amount;
                if (t.category === 'fixed') fixed += t.amount;
                else if (t.category === 'food') food += t.amount;
                else if (t.category === 'other') other += t.amount;
            }
            if (t.type === 'savings') savings += t.amount;
        });

        const rate = income > 0 ? Math.round((savings / income) * 100) : 0;

        // Update DOM
        document.getElementById('year-income').textContent = `₩ ${income.toLocaleString()} `;
        document.getElementById('year-expense').textContent = `₩ ${expense.toLocaleString()} `;
        document.getElementById('year-savings').textContent = `₩ ${savings.toLocaleString()} `;
        const rateEl = document.getElementById('year-rate');
        if (rateEl) rateEl.textContent = rate;

        // Update Bar Charts
        const maxCat = Math.max(fixed, food, other, 1);
        const bars = document.querySelectorAll('#section-overview .bar');
        const values = document.querySelectorAll('#section-overview .bar-value');

        if (bars[0]) bars[0].style.width = `${(fixed / maxCat) * 100}% `;
        if (values[0]) values[0].textContent = `${Math.round((fixed / expense) * 100) || 0}% `;

        if (bars[1]) bars[1].style.width = `${(food / maxCat) * 100}% `;
        if (values[1]) values[1].textContent = `${Math.round((food / expense) * 100) || 0}% `;

        if (bars[2]) bars[2].style.width = `${(other / maxCat) * 100}% `;
        if (values[2]) values[2].textContent = `${Math.round((other / expense) * 100) || 0}% `;
    }

    function getCategoryName(key) {
        const map = {
            'fixed': '고정지출',
            'food': '식비',
            'other': '기타',
            'salary': '월급',
            'bonus': '보너스',
            'savings': '저축'
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

    // --- Category Cards Detail View ---
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const cat = card.getAttribute('data-category');
            renderDetailModal(cat);
            document.getElementById('detail-modal-overlay').classList.add('active');
        });
    });

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
