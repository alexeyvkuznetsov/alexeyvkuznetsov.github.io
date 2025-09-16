// Dashboard application
class HistoricalDashboard {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.charts = {};
        this.filters = {
            month: '', category: '', location: '', source: '', confidence: '', search: ''
        };
        this.sortState = { column: 'source_date', direction: 'asc' };

        // --- Добавляем свойства для хранения полного диапазона дат ---
        this.fullDateRange = { start: null, end: null };

        // Элементы модального окна
        this.modalOverlay = document.getElementById('event-modal-overlay');
        this.modalTitle = document.getElementById('modal-title');
        this.modalBody = document.getElementById('modal-body');
        this.modalCloseBtn = document.getElementById('modal-close-btn');

        // Новые элементы для визуализаций
        this.keywordCloudContainer = document.getElementById('keyword-cloud-container');
        this.emotionChronologyContainer = document.getElementById('emotion-chronology-container');

        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.setupFilters();
            this.setupEventListeners();
            this.initializeCharts();
            this.updateDashboard();
        } catch (error) {
            console.error('Ошибка инициализации дашборда:', error);
            this.hideLoading();
            alert('Ошибка загрузки данных. Пожалуйста, обновите страницу.');
        }
    }

    async loadData() {
        const response = await fetch('dashboard_data.json');
        if (!response.ok) {
            throw new Error(`Не удалось загрузить dashboard_data.json: ${response.statusText}`);
        }
        const jsonData = await response.json();

        this.data = this.validateData(jsonData.events || []);
        this.data.forEach((event, index) => {
            event.unique_id = `${event.entry_id}_${index}`;
        });

        // --- Определяем и сохраняем полный диапазон дат ОДИН РАЗ ---
        if (this.data.length > 0) {
            const dates = this.data.map(event => new Date(event.source_date));
            this.fullDateRange.start = new Date(Math.min.apply(null, dates));
            this.fullDateRange.end = new Date(Math.max.apply(null, dates));
        }

        this.filteredData = [...this.data];
        console.log(`Загружено и валидировано ${this.data.length} событий`);
    }

    validateData(events) {
        const startDate = new Date('1849-01-01');
        const endDate = new Date('1849-12-31');

        return events.filter(event => {
            if (!event.source_date || !event.event_name || !event.description) {
                return false;
            }
            const eventDate = new Date(event.source_date);
            if (isNaN(eventDate.getTime()) || eventDate < startDate || eventDate > endDate) {
                return false;
            }
            if (!Array.isArray(event.keywords)) {
                event.keywords = [];
            }
            return true;
        });
    }

    setupFilters() {
        this.populateMonthFilter();
        this.populateCategoryFilter();
        this.populateLocationFilter();
        this.populateSourceFilter();
        this.populateConfidenceFilter();
    }

    // ... (Все populate-функции остаются без изменений) ...
    populateMonthFilter() { const monthFilter = document.getElementById('month-filter'); const months = new Set(); this.data.forEach(event => { const date = new Date(event.source_date); const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; months.add(monthKey); }); const monthNames = { '1849-01': 'Январь 1849', '1849-02': 'Февраль 1849', '1849-03': 'Март 1849', '1849-04': 'Апрель 1849', '1849-05': 'Май 1849', '1849-06': 'Июнь 1849', '1849-07': 'Июль 1849', '1849-08': 'Август 1849', '1849-09': 'Сентябрь 1849' }; Array.from(months).sort().forEach(month => { const option = document.createElement('option'); option.value = month; option.textContent = monthNames[month] || month; monthFilter.appendChild(option); }); }
    populateCategoryFilter() { const categoryFilter = document.getElementById('category-filter'); const categories = new Set(); this.data.forEach(event => { if (event.event_id) { const prefix = event.event_id.split('_')[0] + '_'; categories.add(prefix); } }); const categoryNames = { 'REV1848_': 'Революции 1848-49', 'RU_': 'Российские реакции', 'AUTHOR_': 'Авторские восприятия', 'IDEOLOGIES_': 'Идеологии и причины', 'OTHER_': 'Прочее' }; Array.from(categories).sort().forEach(category => { const option = document.createElement('option'); option.value = category; option.textContent = categoryNames[category] || category; categoryFilter.appendChild(option); }); }
    populateLocationFilter() { const locationFilter = document.getElementById('location-filter'); const locations = new Set(); this.data.forEach(event => { if (event.location_normalized) locations.add(event.location_normalized); }); Array.from(locations).sort().forEach(location => { const option = document.createElement('option'); option.value = location; option.textContent = location; locationFilter.appendChild(option); }); }
    populateSourceFilter() { const sourceFilter = document.getElementById('source-filter'); const sources = new Set(); this.data.forEach(event => { if (event.information_source_type) sources.add(event.information_source_type); }); Array.from(sources).sort().forEach(source => { const option = document.createElement('option'); option.value = source; option.textContent = source; sourceFilter.appendChild(option); }); }
    populateConfidenceFilter() { const confidenceFilter = document.getElementById('confidence-filter'); const levels = ['High', 'Medium', 'Low']; const levelNames = { 'High': 'Высокий', 'Medium': 'Средний', 'Low': 'Низкий' }; levels.forEach(level => { const option = document.createElement('option'); option.value = level; option.textContent = levelNames[level]; confidenceFilter.appendChild(option); }); }

    setupEventListeners() {
        document.getElementById('month-filter').addEventListener('change', (e) => this.handleFilterChange('month', e.target.value));
        document.getElementById('category-filter').addEventListener('change', (e) => this.handleFilterChange('category', e.target.value));
        document.getElementById('location-filter').addEventListener('change', (e) => this.handleFilterChange('location', e.target.value));
        document.getElementById('source-filter').addEventListener('change', (e) => this.handleFilterChange('source', e.target.value));
        document.getElementById('confidence-filter').addEventListener('change', (e) => this.handleFilterChange('confidence', e.target.value));
        document.getElementById('text-search').addEventListener('input', (e) => this.handleFilterChange('search', e.target.value.toLowerCase()));
        document.getElementById('reset-filters').addEventListener('click', () => this.resetFilters());
        document.getElementById('export-csv').addEventListener('click', () => this.exportToCSV());
        document.querySelectorAll('#events-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.sortTable(th.dataset.sort));
        });
        this.modalCloseBtn.addEventListener('click', () => this.hideEventDetails());
        this.modalOverlay.addEventListener('click', (e) => { if (e.target === this.modalOverlay) this.hideEventDetails(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !this.modalOverlay.classList.contains('hidden')) this.hideEventDetails(); });
    }

    handleFilterChange(key, value) {
        this.filters[key] = value;
        this.applyFilters();
    }

    applyFilters() {
        this.filteredData = this.data.filter(event => {
            if (this.filters.month) {
                const eventDate = new Date(event.source_date);
                const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
                if (monthKey !== this.filters.month) return false;
            }
            if (this.filters.category && (!event.event_id || !event.event_id.startsWith(this.filters.category))) return false;
            if (this.filters.location && event.location_normalized !== this.filters.location) return false;
            if (this.filters.source && event.information_source_type !== this.filters.source) return false;
            if (this.filters.confidence && event.confidence !== this.filters.confidence) return false;
            if (this.filters.search) {
                const searchIn = [event.event_name, event.description, event.location_normalized, event.information_source, event.text_fragment, ...(event.keywords || [])].join(' ').toLowerCase();
                if (!searchIn.includes(this.filters.search)) return false;
            }
            return true;
        });
        this.updateDashboard();
        this.updateActiveFilters();
    }

    resetFilters() {
        this.filters = { month: '', category: '', location: '', source: '', confidence: '', search: '' };
        document.getElementById('month-filter').value = '';
        document.getElementById('category-filter').value = '';
        document.getElementById('location-filter').value = '';
        document.getElementById('source-filter').value = '';
        document.getElementById('confidence-filter').value = '';
        document.getElementById('text-search').value = '';
        this.filteredData = [...this.data];
        this.updateDashboard();
        this.updateActiveFilters();
    }

    updateActiveFilters() {
        const container = document.getElementById('active-filters');
        const hasFilters = Object.values(this.filters).some(filter => filter !== '');
        if (!hasFilters) {
            container.innerHTML = '<p class="no-filters">Фильтры не применены</p>';
            return;
        }
        const filterNames = { month: 'Месяц', category: 'Категория', location: 'Локация', source: 'Источник', confidence: 'Достоверность', search: 'Поиск' };
        const activeFilters = Object.entries(this.filters).filter(([, value]) => value !== '').map(([key, value]) => {
            let displayValue = value;
            if (key === 'confidence') {
                const confidenceNames = { 'High': 'Высокий', 'Medium': 'Средний', 'Low': 'Низкий' };
                displayValue = confidenceNames[value] || value;
            }
            return `<span class="filter-tag">${filterNames[key]}: ${displayValue}</span>`;
        });
        container.innerHTML = activeFilters.join('');
    }

    initializeCharts() {
        this.initTimelineChart();
        this.initCategoryChart();
        this.initLocationChart();
        this.initSourceChart();
        this.initConfidenceChart();
    }
    initTimelineChart() { const ctx = document.getElementById('timeline-chart').getContext('2d'); this.charts.timeline = new Chart(ctx, { type: 'line', data: { labels: [], datasets: [{ label: 'Количество событий', data: [], borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)', tension: 0.3, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } }); }
    initCategoryChart() { const ctx = document.getElementById('category-chart').getContext('2d'); this.charts.category = new Chart(ctx, { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } }); }
    initLocationChart() { const ctx = document.getElementById('location-chart').getContext('2d'); this.charts.location = new Chart(ctx, { type: 'bar', data: { labels: [], datasets: [{ label: 'Количество событий', data: [], backgroundColor: '#2563eb' }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } } }); }
    initSourceChart() { const ctx = document.getElementById('source-chart').getContext('2d'); this.charts.source = new Chart(ctx, { type: 'pie', data: { labels: [], datasets: [{ data: [], backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } } }); }
    initConfidenceChart() { const ctx = document.getElementById('confidence-chart').getContext('2d'); this.charts.confidence = new Chart(ctx, { type: 'bar', data: { labels: [], datasets: [{ label: 'Количество событий', data: [], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } }); }

    updateDashboard() {
        this.updateStats();
        this.updateCharts();
        this.updateTable();
        this.renderKeywordCloud(this.filteredData);
        this.renderEmotionChronology(this.filteredData);
        this.hideLoading();
    }

    updateStats() {
        document.getElementById('total-events').textContent = this.data.length;
        document.getElementById('filtered-events').textContent = this.filteredData.length;
        if (this.data.length > 0) {
            const startDate = this.fullDateRange.start.toLocaleDateString('ru-RU');
            const endDate = this.fullDateRange.end.toLocaleDateString('ru-RU');
            document.getElementById('date-range').textContent = `${startDate} - ${endDate}`;
        }
    }

    updateCharts() {
        this.updateTimelineChart();
        this.updateCategoryChart();
        this.updateLocationChart();
        this.updateSourceChart();
        this.updateConfidenceChart();
    }

    // --- START: ПОЛНОСТЬЮ ПЕРЕРАБОТАННЫЙ БЛОК ---
    _getWeekStartDate(d) {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    updateTimelineChart() {
        if (!this.fullDateRange.start) {
            this.charts.timeline.data.labels = [];
            this.charts.timeline.data.datasets[0].data = [];
            this.charts.timeline.update();
            return;
        }

        // 1. Агрегируем отфильтрованные события по неделям
        const weekCounts = {};
        this.filteredData.forEach(event => {
            const weekStart = this._getWeekStartDate(event.source_date);
            const weekKey = weekStart.toISOString().split('T')[0];
            weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1;
        });

        // 2. Генерируем непрерывный список всех недель в полном диапазоне
        const allWeeks = [];
        let currentWeek = this._getWeekStartDate(this.fullDateRange.start);
        const lastWeek = this._getWeekStartDate(this.fullDateRange.end);

        while (currentWeek <= lastWeek) {
            allWeeks.push(new Date(currentWeek));
            currentWeek.setDate(currentWeek.getDate() + 7);
        }

        // 3. Формируем метки и данные для графика, используя непрерывный список
        const labels = allWeeks.map(weekStartDate => {
            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekStartDate.getDate() + 6);
            const format = (date) => `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
            return `${format(weekStartDate)}–${format(weekEndDate)}`;
        });

        const data = allWeeks.map(weekStartDate => {
            const weekKey = weekStartDate.toISOString().split('T')[0];
            return weekCounts[weekKey] || 0; // Возвращаем 0, если событий не было
        });

        // 4. Обновляем график
        this.charts.timeline.data.labels = labels;
        this.charts.timeline.data.datasets[0].data = data;
        this.charts.timeline.options.scales.x = { // Динамически настраиваем отображение меток
            ticks: {
                maxRotation: 90,
                minRotation: 70,
                callback: function(value, index, values) {
                    // Показывать каждую вторую или третью метку, если их слишком много
                    const maxLabels = 15;
                    const step = Math.ceil(values.length / maxLabels);
                    return index % step === 0 ? this.getLabelForValue(value) : '';
                }
            }
        };
        this.charts.timeline.update();
    }
    // --- END: ПОЛНОСТЬЮ ПЕРЕРАБОТАННЫЙ БЛОК ---

    updateCategoryChart() { const categoryCounts = {}; const categoryNames = { 'REV1848_': 'Революции 1848-49', 'RU_': 'Российские реакции', 'AUTHOR_': 'Авторские восприятия', 'IDEOLOGIES_': 'Идеологии и причины', 'OTHER_': 'Прочее' }; this.filteredData.forEach(event => { if (event.event_id) { const prefix = event.event_id.split('_')[0] + '_'; const categoryName = categoryNames[prefix] || 'Прочее'; categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1; } }); this.charts.category.data.labels = Object.keys(categoryCounts); this.charts.category.data.datasets[0].data = Object.values(categoryCounts); this.charts.category.update(); }
    updateLocationChart() { const locationCounts = {}; this.filteredData.forEach(event => { if (event.location_normalized) { locationCounts[event.location_normalized] = (locationCounts[event.location_normalized] || 0) + 1; } }); const sortedLocations = Object.entries(locationCounts).sort(([, a], [, b]) => b - a).slice(0, 10); this.charts.location.data.labels = sortedLocations.map(([location]) => location); this.charts.location.data.datasets[0].data = sortedLocations.map(([, count]) => count); this.charts.location.update(); }
    updateSourceChart() { const sourceCounts = {}; this.filteredData.forEach(event => { if (event.information_source_type) { const shortName = this.getShortSourceName(event.information_source_type); sourceCounts[shortName] = (sourceCounts[shortName] || 0) + 1; } }); this.charts.source.data.labels = Object.keys(sourceCounts); this.charts.source.data.datasets[0].data = Object.values(sourceCounts); this.charts.source.update(); }
    updateConfidenceChart() { const confidenceCounts = {}; const confidenceNames = { 'High': 'Высокий', 'Medium': 'Средний', 'Low': 'Низкий' }; this.filteredData.forEach(event => { if (event.confidence) { const name = confidenceNames[event.confidence] || event.confidence; confidenceCounts[name] = (confidenceCounts[name] || 0) + 1; } }); this.charts.confidence.data.labels = Object.keys(confidenceCounts); this.charts.confidence.data.datasets[0].data = Object.values(confidenceCounts); this.charts.confidence.update(); }
    getShortSourceName(sourceName) { const shortNames = { 'Официальные источники (газеты, манифесты)': 'Офиц. источники', 'Личные наблюдения и опыт автора': 'Личн. опыт', 'Неофициальные сведения (слухи, разговоры в обществе)': 'Слухи', 'Информация от конкретного лица (именованный источник)': 'Именов. источник', 'Источник неясен/не указан': 'Неясный источник' }; return shortNames[sourceName] || sourceName; }

    updateTable() {
        const tbody = document.getElementById('events-tbody');
        tbody.innerHTML = '';
        if (this.filteredData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><h4>Нет данных</h4><p>Попробуйте изменить параметры фильтрации</p></td></tr>';
            return;
        }
        const sortedData = [...this.filteredData].sort((a, b) => {
            const aVal = a[this.sortState.column] || '';
            const bVal = b[this.sortState.column] || '';
            if (this.sortState.column === 'source_date') {
                return this.sortState.direction === 'asc' ? new Date(aVal) - new Date(bVal) : new Date(bVal) - new Date(aVal);
            }
            const comparison = aVal.toString().localeCompare(bVal.toString(), 'ru');
            return this.sortState.direction === 'asc' ? comparison : -comparison;
        });
        sortedData.forEach(event => {
            const row = document.createElement('tr');
            row.dataset.eventId = event.unique_id;
            const date = new Date(event.source_date).toLocaleDateString('ru-RU');
            const confidenceBadge = this.getConfidenceBadge(event.confidence);
            row.innerHTML = `<td>${date}</td><td>${event.event_name}</td><td>${event.location_normalized || 'Не указано'}</td><td title="${event.information_source_type}">${this.getShortSourceName(event.information_source_type)}</td><td>${confidenceBadge}</td><td title="${event.description}">${event.description}</td>`;
            row.addEventListener('click', () => this.showEventDetails(event.unique_id));
            tbody.appendChild(row);
        });
    }

    getConfidenceBadge(confidence) { const badges = { 'High': '<span class="status-badge status-badge--high">Высокий</span>', 'Medium': '<span class="status-badge status-badge--medium">Средний</span>', 'Low': '<span class="status-badge status-badge--low">Низкий</span>' }; return badges[confidence] || confidence; }
    sortTable(column) { if (this.sortState.column === column) { this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc'; } else { this.sortState.column = column; this.sortState.direction = 'asc'; } document.querySelectorAll('#events-table th').forEach(th => { th.classList.remove('sort-asc', 'sort-desc'); }); const activeHeader = document.querySelector(`#events-table th[data-sort="${column}"]`); activeHeader.classList.add(`sort-${this.sortState.direction}`); this.updateTable(); }
    exportToCSV() { if (this.filteredData.length === 0) { alert('Нет данных для экспорта'); return; } const headers = ['Дата', 'Событие', 'Локация', 'Источник', 'Достоверность', 'Описание', 'Фрагмент текста']; const csvContent = [ headers.join(','), ...this.filteredData.map(event => [ event.source_date, `"${event.event_name.replace(/"/g, '""')}"`, `"${(event.location_normalized || 'Не указано').replace(/"/g, '""')}"`, `"${event.information_source_type.replace(/"/g, '""')}"`, event.confidence, `"${event.description.replace(/"/g, '""')}"`, `"${(event.text_fragment || '').replace(/"/g, '""')}"` ].join(',')) ].join('\n'); const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); const url = URL.createObjectURL(blob); link.setAttribute('href', url); link.setAttribute('download', `historical_diary_data_${new Date().toISOString().slice(0, 10)}.csv`); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); }
    showEventDetails(eventId) { const event = this.data.find(e => e.unique_id === eventId); if (!event) return; this.modalTitle.textContent = event.event_name; this.modalBody.innerHTML = `<div class="modal-detail-item"><strong>Дата:</strong><p>${new Date(event.source_date).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div><div class="modal-detail-item"><strong>Описание:</strong><p>${event.description}</p></div><div class="modal-detail-item"><strong>Фрагмент текста:</strong><p><em>"${event.text_fragment || 'Нет данных'}"</em></p></div><div class="modal-detail-item"><strong>Локация:</strong><p>${event.location_normalized || 'Не указано'}</p></div><div class="modal-detail-item"><strong>Источник информации:</strong><p>${event.information_source_type}</p></div><div class="modal-detail-item"><strong>Краткий контекст:</strong><p>${event.brief_context || 'Нет данных'}</p></div><div class="modal-detail-item"><strong>Ключевые слова:</strong><div class="modal-keywords">${event.keywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join('')}</div></div>`; this.modalOverlay.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
    hideEventDetails() { this.modalOverlay.classList.add('hidden'); document.body.style.overflow = ''; }
    hideLoading() { document.getElementById('loading').classList.add('hidden'); }
    renderKeywordCloud(events) { this.keywordCloudContainer.innerHTML = ''; const keywordCounts = {}; events.forEach(event => { (event.keywords || []).forEach(kw => { keywordCounts[kw] = (keywordCounts[kw] || 0) + 1; }); }); const keywords = Object.entries(keywordCounts); if (keywords.length === 0) { this.keywordCloudContainer.innerHTML = '<p class="empty-state">Нет ключевых слов для отображения.</p>'; return; } const counts = keywords.map(([, count]) => count); const minCount = Math.min(...counts); const maxCount = Math.max(...counts); keywords.sort((a, b) => b[1] - a[1]).slice(0, 40).sort((a,b) => a[0].localeCompare(b[0])).forEach(([word, count]) => { const minSize = 12, maxSize = 24; const size = (maxCount === minCount) ? minSize : minSize + ((count - minCount) / (maxCount - minCount)) * (maxSize - minSize); const span = document.createElement('span'); span.className = 'keyword-cloud-item'; span.textContent = word; span.style.fontSize = `${size}px`; span.title = `Встречается: ${count} раз(а)`; this.keywordCloudContainer.appendChild(span); }); }
    renderEmotionChronology(events) { this.emotionChronologyContainer.innerHTML = ''; const emotionalEvents = events.filter(e => e.event_id.startsWith('AUTHOR_PERCEPTION_')).sort((a, b) => new Date(a.source_date) - new Date(b.source_date)); if (emotionalEvents.length === 0) { this.emotionChronologyContainer.innerHTML = '<p class="empty-state">Нет записей о восприятии автора.</p>'; return; } emotionalEvents.forEach(event => { const item = document.createElement('div'); item.className = 'emotion-item'; const date = new Date(event.source_date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }); const type = event.event_subtype_custom || event.event_name; const quote = event.text_fragment ? `"${event.text_fragment.substring(0, 120)}..."` : ''; item.innerHTML = `<div class="emotion-header"><span class="emotion-header__date">${date}</span><span class="emotion-header__type">${type}</span></div><blockquote class="emotion-quote">${quote}</blockquote>`; this.emotionChronologyContainer.appendChild(item); }); }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new HistoricalDashboard();
});