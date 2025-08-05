// Dashboard application
class HistoricalDashboard {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.charts = {};
        this.filters = {
            month: '',
            category: '',
            location: '',
            source: '',
            confidence: '',
            search: ''
        };
        this.sortState = { column: 'source_date', direction: 'asc' };
        
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
        const response = await fetch('https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/f1cb3b83446ec02ec14421029477ffc7/3bcdf2f2-27e8-4a3b-bbb6-2bf1d8bc24fa/02c56ae1.json');
        const jsonData = await response.json();
        
        // Строгая валидация данных
        this.data = this.validateData(jsonData.events || []);
        this.filteredData = [...this.data];
        
        console.log(`Загружено и валидировано ${this.data.length} событий`);
    }

    validateData(events) {
        const startDate = new Date('1849-01-07');
        const endDate = new Date('1849-09-09');
        
        return events.filter(event => {
            // Проверка обязательных полей
            if (!event.source_date || !event.event_name || !event.description) {
                return false;
            }
            
            // Проверка временного диапазона
            const eventDate = new Date(event.source_date);
            if (eventDate < startDate || eventDate > endDate) {
                return false;
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

    populateMonthFilter() {
        const monthFilter = document.getElementById('month-filter');
        const months = new Set();
        
        this.data.forEach(event => {
            const date = new Date(event.source_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.add(monthKey);
        });
        
        const monthNames = {
            '1849-01': 'Январь 1849',
            '1849-02': 'Февраль 1849',
            '1849-03': 'Март 1849',
            '1849-04': 'Апрель 1849',
            '1849-05': 'Май 1849',
            '1849-06': 'Июнь 1849',
            '1849-07': 'Июль 1849',
            '1849-08': 'Август 1849',
            '1849-09': 'Сентябрь 1849'
        };
        
        Array.from(months).sort().forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = monthNames[month] || month;
            monthFilter.appendChild(option);
        });
    }

    populateCategoryFilter() {
        const categoryFilter = document.getElementById('category-filter');
        const categories = new Set();
        
        this.data.forEach(event => {
            if (event.event_id) {
                const prefix = event.event_id.split('_')[0] + '_';
                categories.add(prefix);
            }
        });
        
        const categoryNames = {
            'REV1848_': 'Революции 1848-49',
            'RU_': 'Российские реакции',
            'AUTHOR_': 'Авторские восприятия',
            'IDEOLOGIES_': 'Идеологии и причины',
            'OTHER_': 'Прочее'
        };
        
        Array.from(categories).sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = categoryNames[category] || category;
            categoryFilter.appendChild(option);
        });
    }

    populateLocationFilter() {
        const locationFilter = document.getElementById('location-filter');
        const locations = new Set();
        
        this.data.forEach(event => {
            if (event.location_normalized) {
                locations.add(event.location_normalized);
            }
        });
        
        Array.from(locations).sort().forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            locationFilter.appendChild(option);
        });
    }

    populateSourceFilter() {
        const sourceFilter = document.getElementById('source-filter');
        const sources = new Set();
        
        this.data.forEach(event => {
            if (event.information_source_type) {
                sources.add(event.information_source_type);
            }
        });
        
        Array.from(sources).sort().forEach(source => {
            const option = document.createElement('option');
            option.value = source;
            option.textContent = source;
            sourceFilter.appendChild(option);
        });
    }

    populateConfidenceFilter() {
        const confidenceFilter = document.getElementById('confidence-filter');
        const levels = ['High', 'Medium', 'Low'];
        const levelNames = {
            'High': 'Высокий',
            'Medium': 'Средний',
            'Low': 'Низкий'
        };
        
        levels.forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = levelNames[level];
            confidenceFilter.appendChild(option);
        });
    }

    setupEventListeners() {
        // Фильтры
        document.getElementById('month-filter').addEventListener('change', (e) => {
            this.filters.month = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('location-filter').addEventListener('change', (e) => {
            this.filters.location = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('source-filter').addEventListener('change', (e) => {
            this.filters.source = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('confidence-filter').addEventListener('change', (e) => {
            this.filters.confidence = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('text-search').addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });
        
        // Сброс фильтров
        document.getElementById('reset-filters').addEventListener('click', () => {
            this.resetFilters();
        });
        
        // Экспорт
        document.getElementById('export-csv').addEventListener('click', () => {
            this.exportToCSV();
        });
        
        // Сортировка таблицы
        document.querySelectorAll('#events-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                this.sortTable(th.dataset.sort);
            });
        });
    }

    applyFilters() {
        this.filteredData = this.data.filter(event => {
            // Фильтр по месяцу
            if (this.filters.month) {
                const eventDate = new Date(event.source_date);
                const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
                if (monthKey !== this.filters.month) return false;
            }
            
            // Фильтр по категории
            if (this.filters.category) {
                if (!event.event_id || !event.event_id.startsWith(this.filters.category)) return false;
            }
            
            // Фильтр по локации
            if (this.filters.location) {
                if (event.location_normalized !== this.filters.location) return false;
            }
            
            // Фильтр по источнику
            if (this.filters.source) {
                if (event.information_source_type !== this.filters.source) return false;
            }
            
            // Фильтр по достоверности
            if (this.filters.confidence) {
                if (event.confidence !== this.filters.confidence) return false;
            }
            
            // Текстовый поиск
            if (this.filters.search) {
                const searchIn = [
                    event.event_name,
                    event.description,
                    event.location_normalized,
                    event.information_source
                ].join(' ').toLowerCase();
                
                if (!searchIn.includes(this.filters.search)) return false;
            }
            
            return true;
        });
        
        this.updateDashboard();
        this.updateActiveFilters();
    }

    resetFilters() {
        this.filters = {
            month: '',
            category: '',
            location: '',
            source: '',
            confidence: '',
            search: ''
        };
        
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
        
        const filterNames = {
            month: 'Месяц',
            category: 'Категория',
            location: 'Локация',
            source: 'Источник',
            confidence: 'Достоверность',
            search: 'Поиск'
        };
        
        const activeFilters = Object.entries(this.filters)
            .filter(([key, value]) => value !== '')
            .map(([key, value]) => {
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

    initTimelineChart() {
        const ctx = document.getElementById('timeline-chart').getContext('2d');
        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Количество событий',
                    data: [],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    initCategoryChart() {
        const ctx = document.getElementById('category-chart').getContext('2d');
        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    initLocationChart() {
        const ctx = document.getElementById('location-chart').getContext('2d');
        this.charts.location = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Количество событий',
                    data: [],
                    backgroundColor: '#2563eb'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    initSourceChart() {
        const ctx = document.getElementById('source-chart').getContext('2d');
        this.charts.source = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });
    }

    initConfidenceChart() {
        const ctx = document.getElementById('confidence-chart').getContext('2d');
        this.charts.confidence = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Количество событий',
                    data: [],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    updateDashboard() {
        this.updateStats();
        this.updateCharts();
        this.updateTable();
        this.hideLoading();
    }

    updateStats() {
        document.getElementById('total-events').textContent = this.data.length;
        document.getElementById('filtered-events').textContent = this.filteredData.length;
        
        if (this.data.length > 0) {
            const dates = this.data.map(event => new Date(event.source_date)).sort((a, b) => a - b);
            const startDate = dates[0].toLocaleDateString('ru-RU');
            const endDate = dates[dates.length - 1].toLocaleDateString('ru-RU');
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

    updateTimelineChart() {
        const monthCounts = {};
        const monthNames = {
            '1849-01': 'Янв',
            '1849-02': 'Фев',
            '1849-03': 'Мар',
            '1849-04': 'Апр',
            '1849-05': 'Май',
            '1849-06': 'Июн',
            '1849-07': 'Июл',
            '1849-08': 'Авг',
            '1849-09': 'Сен'
        };
        
        this.filteredData.forEach(event => {
            const date = new Date(event.source_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
        });
        
        const labels = Object.keys(monthNames);
        const data = labels.map(month => monthCounts[month] || 0);
        
        this.charts.timeline.data.labels = labels.map(month => monthNames[month]);
        this.charts.timeline.data.datasets[0].data = data;
        this.charts.timeline.update();
    }

    updateCategoryChart() {
        const categoryCounts = {};
        const categoryNames = {
            'REV1848_': 'Революции 1848-49',
            'RU_': 'Российские реакции',
            'AUTHOR_': 'Авторские восприятия',
            'IDEOLOGIES_': 'Идеологии и причины',
            'OTHER_': 'Прочее'
        };
        
        this.filteredData.forEach(event => {
            if (event.event_id) {
                const prefix = event.event_id.split('_')[0] + '_';
                const categoryName = categoryNames[prefix] || 'Прочее';
                categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
            }
        });
        
        this.charts.category.data.labels = Object.keys(categoryCounts);
        this.charts.category.data.datasets[0].data = Object.values(categoryCounts);
        this.charts.category.update();
    }

    updateLocationChart() {
        const locationCounts = {};
        
        this.filteredData.forEach(event => {
            if (event.location_normalized) {
                locationCounts[event.location_normalized] = (locationCounts[event.location_normalized] || 0) + 1;
            }
        });
        
        const sortedLocations = Object.entries(locationCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        this.charts.location.data.labels = sortedLocations.map(([location]) => location);
        this.charts.location.data.datasets[0].data = sortedLocations.map(([,count]) => count);
        this.charts.location.update();
    }

    updateSourceChart() {
        const sourceCounts = {};
        
        this.filteredData.forEach(event => {
            if (event.information_source_type) {
                const shortName = this.getShortSourceName(event.information_source_type);
                sourceCounts[shortName] = (sourceCounts[shortName] || 0) + 1;
            }
        });
        
        this.charts.source.data.labels = Object.keys(sourceCounts);
        this.charts.source.data.datasets[0].data = Object.values(sourceCounts);
        this.charts.source.update();
    }

    updateConfidenceChart() {
        const confidenceCounts = {};
        const confidenceNames = {
            'High': 'Высокий',
            'Medium': 'Средний',
            'Low': 'Низкий'
        };
        
        this.filteredData.forEach(event => {
            if (event.confidence) {
                const name = confidenceNames[event.confidence] || event.confidence;
                confidenceCounts[name] = (confidenceCounts[name] || 0) + 1;
            }
        });
        
        this.charts.confidence.data.labels = Object.keys(confidenceCounts);
        this.charts.confidence.data.datasets[0].data = Object.values(confidenceCounts);
        this.charts.confidence.update();
    }

    getShortSourceName(sourceName) {
        const shortNames = {
            'Официальные источники (газеты, манифесты)': 'Офиц. источники',
            'Личные наблюдения и опыт автора': 'Личн. опыт',
            'Неофициальные сведения (слухи, разговоры в обществе)': 'Слухи',
            'Информация от конкретного лица (именованный источник)': 'Именов. источник',
            'Источник неясен/не указан': 'Неясный источник'
        };
        return shortNames[sourceName] || sourceName;
    }

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
                const dateA = new Date(aVal);
                const dateB = new Date(bVal);
                return this.sortState.direction === 'asc' ? dateA - dateB : dateB - dateA;
            }
            
            const comparison = aVal.toString().localeCompare(bVal.toString(), 'ru');
            return this.sortState.direction === 'asc' ? comparison : -comparison;
        });
        
        sortedData.forEach(event => {
            const row = document.createElement('tr');
            
            const date = new Date(event.source_date).toLocaleDateString('ru-RU');
            const confidenceBadge = this.getConfidenceBadge(event.confidence);
            
            row.innerHTML = `
                <td>${date}</td>
                <td>${event.event_name}</td>
                <td>${event.location_normalized || 'Не указано'}</td>
                <td title="${event.information_source_type}">${this.getShortSourceName(event.information_source_type)}</td>
                <td>${confidenceBadge}</td>
                <td title="${event.description}">${event.description}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    getConfidenceBadge(confidence) {
        const badges = {
            'High': '<span class="status-badge status-badge--high">Высокий</span>',
            'Medium': '<span class="status-badge status-badge--medium">Средний</span>',
            'Low': '<span class="status-badge status-badge--low">Низкий</span>'
        };
        return badges[confidence] || confidence;
    }

    sortTable(column) {
        if (this.sortState.column === column) {
            this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortState.column = column;
            this.sortState.direction = 'asc';
        }
        
        // Обновить визуальные индикаторы сортировки
        document.querySelectorAll('#events-table th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        
        const activeHeader = document.querySelector(`#events-table th[data-sort="${column}"]`);
        activeHeader.classList.add(`sort-${this.sortState.direction}`);
        
        this.updateTable();
    }

    exportToCSV() {
        if (this.filteredData.length === 0) {
            alert('Нет данных для экспорта');
            return;
        }
        
        const headers = ['Дата', 'Событие', 'Локация', 'Источник', 'Достоверность', 'Описание'];
        const csvContent = [
            headers.join(','),
            ...this.filteredData.map(event => [
                event.source_date,
                event.event_name.replace(/,/g, ';'),
                event.location_normalized || 'Не указано',
                event.information_source_type.replace(/,/g, ';'),
                event.confidence,
                event.description.replace(/,/g, ';')
            ].map(field => `"${field}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `historical_diary_data_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new HistoricalDashboard();
});