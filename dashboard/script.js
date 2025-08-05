/**
 * ВАЖНОЕ ПРИМЕЧАНИЕ ДЛЯ ЗАПУСКА:
 * Для корректной работы с локальными файлами (из-за политики CORS браузеров),
 * файл index.html следует открывать через локальный веб-сервер.
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- Глобальное состояние ---
    let allEvents = [];
    let dateRange = { min: null, max: null };

    // --- Ссылки на DOM элементы ---
    const filterElements = {
        month: document.getElementById('month-filter'),
        category: document.getElementById('category-filter'),
        location: document.getElementById('location-filter'),
        sourceType: document.getElementById('source-type-filter'),
        confidence: document.getElementById('confidence-filter'),
    };
    const eventsContainer = document.getElementById('events-container');
    const resultsCounter = document.getElementById('results-counter');
    const timelineContainer = document.getElementById('timeline-container');
    const geoStatsContainer = document.getElementById('geo-stats-container');
    const authorPerceptionChart = document.getElementById('author-perception-chart');
    const keywordCloudContainer = document.getElementById('keyword-cloud-container');
    const emotionChronologyContainer = document.getElementById('emotion-chronology-container');

    // --- Инициализация ---
    async function initDashboard() {
        try {
            const response = await fetch('data/revolution_events.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            allEvents = await response.json();

            allEvents.sort((a, b) => new Date(a.source_date) - new Date(b.source_date));

            // Определяем временной диапазон
            const dates = allEvents.map(e => new Date(e.source_date).getTime());
            dateRange.min = Math.min(...dates);
            dateRange.max = Math.max(...dates);

            populateFilters(allEvents);
            setupEventListeners();
            updateDisplay();
        } catch (error) {
            console.error("Ошибка при загрузке или обработке данных:", error);
            resultsCounter.textContent = 'Ошибка загрузки данных';
        }
    }

    // --- Популяция фильтров (логика осталась прежней) ---
    function populateFilters(events) {
        const locations = new Set(), sourceTypes = new Set(), confidences = new Set(), months = new Set();
        const categoryMap = {'REV1848_': 'События в Европе', 'RU_REACTION_': 'Реакция в России', 'AUTHOR_PERCEPTION_': 'Восприятие автора'};
        const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

        events.forEach(event => {
            if (event.location_normalized) locations.add(event.location_normalized);
            if (event.information_source_type) sourceTypes.add(event.information_source_type);
            if (event.confidence) confidences.add(event.confidence);
            if (event.source_date) {
                const monthIndex = new Date(event.source_date).getMonth();
                months.add(JSON.stringify({ index: monthIndex, name: monthNames[monthIndex] }));
            }
        });

        const createOptions = (select, items, isObject) => {
            const sorted = Array.from(items).sort((a, b) => isObject ? JSON.parse(a).index - JSON.parse(b).index : a.localeCompare(b, 'ru'));
            sorted.forEach(item => {
                const option = document.createElement('option');
                if (isObject) {
                    const parsed = JSON.parse(item);
                    option.value = parsed.index;
                    option.textContent = parsed.name;
                } else {
                    option.value = item;
                    option.textContent = item;
                }
                select.appendChild(option);
            });
        };

        createOptions(filterElements.location, locations);
        createOptions(filterElements.sourceType, sourceTypes);
        createOptions(filterElements.confidence, confidences);
        createOptions(filterElements.month, months, true);

        for (const [prefix, name] of Object.entries(categoryMap)) {
            const option = document.createElement('option');
            option.value = prefix;
            option.textContent = name;
            filterElements.category.appendChild(option);
        }
    }

    // --- Установка обработчиков ---
    function setupEventListeners() {
        Object.values(filterElements).forEach(select => select.addEventListener('change', updateDisplay));
    }

    /**
     * ГЛАВНАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ
     * Фильтрует данные и вызывает все функции рендеринга.
     */
    function updateDisplay() {
        const filters = {
            month: filterElements.month.value,
            category: filterElements.category.value,
            location: filterElements.location.value,
            sourceType: filterElements.sourceType.value,
            confidence: filterElements.confidence.value,
        };

        const filteredEvents = allEvents.filter(event => {
            const eventDate = new Date(event.source_date);
            return (filters.month === 'all' || eventDate.getMonth() == filters.month) &&
                   (filters.category === 'all' || event.event_id.startsWith(filters.category)) &&
                   (filters.location === 'all' || event.location_normalized === filters.location) &&
                   (filters.sourceType === 'all' || event.information_source_type === filters.sourceType) &&
                   (filters.confidence === 'all' || event.confidence === filters.confidence);
        });

        // Вызов всех функций отрисовки
        renderEvents(filteredEvents);
        renderTimeline(filteredEvents);
        renderGeoStats(filteredEvents);
        renderAuthorPerceptionChart(filteredEvents);
        renderKeywordCloud(filteredEvents);
        renderEmotionChronology(filteredEvents);
    }

    // --- ФУНКЦИИ РЕНДЕРИНГА ---

    function renderEvents(events) {
        eventsContainer.innerHTML = '';
        if (events.length === 0) {
            eventsContainer.innerHTML = `<p class="no-results">События по заданным критериям не найдены.</p>`;
        } else {
            events.forEach(event => {
                const card = document.createElement('div');
                card.className = 'event-card';
                card.innerHTML = `<h3>${event.event_name}</h3><p class="description">${event.description || 'Описание отсутствует.'}</p><div class="details"><div class="detail-item"><strong>Дата:</strong> <span>${new Date(event.source_date).toLocaleDateString('ru-RU')}</span></div><div class="detail-item"><strong>Локация:</strong> <span>${event.location_normalized || 'Не указано'}</span></div><div class="detail-item"><strong>Источник:</strong> <span>${event.information_source_type || 'Не указан'}</span></div><div class="detail-item"><strong>Уверенность:</strong> <span>${event.confidence || 'Не указана'}</span></div></div>`;
                eventsContainer.appendChild(card);
            });
        }
        resultsCounter.textContent = `Найдено событий: ${events.length}`;
    }

    function renderTimeline(events) {
        timelineContainer.innerHTML = `<div class="timeline-line"></div>`;
        if (events.length === 0) return;

        const totalDuration = dateRange.max - dateRange.min;

        events.forEach(event => {
            const eventTime = new Date(event.source_date).getTime();
            const position = totalDuration > 0 ? ((eventTime - dateRange.min) / totalDuration) * 100 : 50;

            const eventNode = document.createElement('div');
            eventNode.className = 'timeline-event';
            eventNode.style.left = `${position}%`;
            eventNode.innerHTML = `<div class="timeline-tooltip">${event.event_name}<br>${new Date(event.source_date).toLocaleDateString('ru-RU')}</div>`;
            timelineContainer.appendChild(eventNode);
        });
    }

    function renderGeoStats(events) {
        renderGroupedList(geoStatsContainer, events, 'location_normalized', 'Нет данных о локациях');
    }

    function renderEmotionChronology(events) {
        emotionChronologyContainer.innerHTML = '';
        const emotionalEvents = events.filter(e => e.event_id.includes('_EMO_') || e.event_subtype_custom.toLowerCase().includes('размышл'));

        if (emotionalEvents.length === 0) {
            emotionChronologyContainer.innerHTML = `<p class="empty-state">Нет данных об эмоциях.</p>`;
            return;
        }

        emotionalEvents.forEach(event => {
            const item = document.createElement('div');
            item.className = 'list-item';
            const date = new Date(event.source_date).toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' });
            item.innerHTML = `
                <div class="label"><strong>${date}:</strong> ${event.event_subtype_custom}</div>
                <div class="emotion-quote">"${event.text_fragment.substring(0, 100)}..."</div>
            `;
            emotionChronologyContainer.appendChild(item);
        });
    }

    function renderAuthorPerceptionChart(events) {
        authorPerceptionChart.innerHTML = '';
        const perceptionEvents = events.filter(e => e.event_id.startsWith('AUTHOR_PERCEPTION_'));
        const groups = groupAndCount(perceptionEvents, 'event_subtype_custom');

        if (Object.keys(groups).length === 0) {
            authorPerceptionChart.innerHTML = `<p class="empty-state">Нет данных о восприятии.</p>`;
            return;
        }

        const maxCount = Math.max(...Object.values(groups));

        Object.entries(groups).sort((a, b) => b[1] - a[1]).forEach(([label, count]) => {
            const width = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const row = document.createElement('div');
            row.className = 'bar-row';
            row.innerHTML = `
                <div class="bar-label" title="${label}">${label}</div>
                <div class="bar-wrapper"><div class="bar" style="width: ${width}%;"></div></div>
                <div class="bar-value">${count}</div>
            `;
            authorPerceptionChart.appendChild(row);
        });
    }

    function renderKeywordCloud(events) {
        keywordCloudContainer.innerHTML = '';
        const keywordCounts = {};
        events.forEach(event => {
            event.keywords.forEach(kw => {
                keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
            });
        });

        const keywords = Object.entries(keywordCounts);
        if (keywords.length === 0) {
            keywordCloudContainer.innerHTML = `<p class="empty-state">Нет ключевых слов.</p>`;
            return;
        }

        const counts = keywords.map(kw => kw[1]);
        const minCount = Math.min(...counts);
        const maxCount = Math.max(...counts);

        keywords.sort((a, b) => a[0].localeCompare(b[0])).forEach(([word, count]) => {
            const minSize = 12, maxSize = 28;
            const size = maxCount === minCount ? minSize : minSize + ((count - minCount) / (maxCount - minCount)) * (maxSize - minSize);

            const span = document.createElement('span');
            span.className = 'keyword-item';
            span.textContent = word;
            span.style.fontSize = `${size}px`;
            keywordCloudContainer.appendChild(span);
        });
    }

    // --- Вспомогательные функции ---

    function groupAndCount(data, key) {
        return data.reduce((acc, item) => {
            const groupKey = item[key] || 'Не указано';
            acc[groupKey] = (acc[groupKey] || 0) + 1;
            return acc;
        }, {});
    }

    function renderGroupedList(container, data, key, emptyMessage) {
        container.innerHTML = '';
        const groups = groupAndCount(data, key);
        if (Object.keys(groups).length === 0) {
            container.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
            return;
        }
        Object.entries(groups).sort((a,b) => b[1] - a[1]).forEach(([label, count]) => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `<span class="label">${label}</span><span class="count">${count}</span>`;
            container.appendChild(item);
        });
    }

    // --- Запуск приложения ---
    initDashboard();
});