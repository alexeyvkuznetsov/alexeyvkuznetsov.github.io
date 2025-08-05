/**
 * ВАЖНОЕ ПРИМЕЧАНИЕ ДЛЯ ЗАПУСКА:
 * Для корректной работы с локальными файлами (из-за политики CORS браузеров),
 * файл index.html следует открывать через локальный веб-сервер.
 *
 * Простые способы это сделать:
 * 1. В VS Code: установить расширение 'Live Server' и нажать 'Go Live'.
 * 2. В терминале (если установлен Python): перейти в папку /dashboard/ и выполнить команду:
 *    `python -m http.server` (для Python 3) или `python -m SimpleHTTPServer` (для Python 2).
 *    Затем открыть в браузере http://localhost:8000
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- Глобальное состояние ---
    /** @type {Array<Object>} */
    let allEvents = []; // Хранилище для всех событий из JSON

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

    /**
     * Основная асинхронная функция для инициализации дашборда.
     * Загружает данные и запускает отрисовку.
     */
    async function initDashboard() {
        try {
            const response = await fetch('data/revolution_events.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allEvents = await response.json();
            
            // Сортируем события по дате для логичного отображения
            allEvents.sort((a, b) => new Date(a.source_date) - new Date(b.source_date));

            populateFilters(allEvents);
            setupEventListeners();
            updateDisplay(); // Первичная отрисовка всех событий
        } catch (error) {
            console.error("Ошибка при загрузке или обработке данных:", error);
            eventsContainer.innerHTML = `<p class="no-results">Не удалось загрузить данные. Проверьте консоль для деталей.</p>`;
            resultsCounter.textContent = 'Ошибка загрузки данных';
        }
    }

    /**
     * Динамически заполняет <select> элементы фильтров на основе загруженных данных.
     * @param {Array<Object>} events - Массив всех событий.
     */
    function populateFilters(events) {
        const locations = new Set();
        const sourceTypes = new Set();
        const confidences = new Set();
        const months = new Set();

        const categoryMap = {
            'REV1848_': 'События в Европе',
            'RU_REACTION_': 'Реакция в России',
            'AUTHOR_PERCEPTION_': 'Восприятие автора',
        };

        const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

        // Сбор уникальных значений
        events.forEach(event => {
            if (event.location_normalized) locations.add(event.location_normalized);
            if (event.information_source_type) sourceTypes.add(event.information_source_type);
            if (event.confidence) confidences.add(event.confidence);
            if (event.source_date) {
                const monthIndex = new Date(event.source_date).getMonth();
                months.add(JSON.stringify({ index: monthIndex, name: monthNames[monthIndex] }));
            }
        });

        // Функция-помощник для создания <option>
        const createOptions = (selectElement, items, isObject = false) => {
            // Сортировка строковых значений по алфавиту
            const sortedItems = Array.from(items).sort((a, b) => {
                if (isObject) {
                    return JSON.parse(a).index - JSON.parse(b).index;
                }
                return a.localeCompare(b, 'ru');
            });

            sortedItems.forEach(item => {
                const option = document.createElement('option');
                if (isObject) {
                    const parsedItem = JSON.parse(item);
                    option.value = parsedItem.index;
                    option.textContent = parsedItem.name;
                } else {
                    option.value = item;
                    option.textContent = item;
                }
                selectElement.appendChild(option);
            });
        };

        // Заполнение фильтров
        createOptions(filterElements.location, locations);
        createOptions(filterElements.sourceType, sourceTypes);
        createOptions(filterElements.confidence, confidences);
        createOptions(filterElements.month, months, true);

        // Отдельное заполнение фильтра категорий
        for (const [prefix, name] of Object.entries(categoryMap)) {
            const option = document.createElement('option');
            option.value = prefix;
            option.textContent = name;
            filterElements.category.appendChild(option);
        }
    }

    /**
     * Устанавливает обработчики событий 'change' для всех фильтров.
     */
    function setupEventListeners() {
        Object.values(filterElements).forEach(select => {
            select.addEventListener('change', updateDisplay);
        });
    }

    /**
     * Фильтрует события на основе текущих значений в фильтрах и вызывает их отрисовку.
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
            const monthMatch = filters.month === 'all' || eventDate.getMonth() == filters.month;
            const categoryMatch = filters.category === 'all' || event.event_id.startsWith(filters.category);
            const locationMatch = filters.location === 'all' || event.location_normalized === filters.location;
            const sourceTypeMatch = filters.sourceType === 'all' || event.information_source_type === filters.sourceType;
            const confidenceMatch = filters.confidence === 'all' || event.confidence === filters.confidence;

            return monthMatch && categoryMatch && locationMatch && sourceTypeMatch && confidenceMatch;
        });

        renderEvents(filteredEvents);
    }
    
    /**
     * Отрисовывает карточки событий в контейнере.
     * @param {Array<Object>} eventsToRender - Массив отфильтрованных событий.
     */
    function renderEvents(eventsToRender) {
        // Очищаем контейнер перед новой отрисовкой
        eventsContainer.innerHTML = '';

        if (eventsToRender.length === 0) {
            eventsContainer.innerHTML = `<p class="no-results">События по заданным критериям не найдены.</p>`;
        } else {
            eventsToRender.forEach(event => {
                const card = document.createElement('div');
                card.className = 'event-card';
                card.innerHTML = `
                    <h3>${event.event_name}</h3>
                    <p class="description">${event.description || 'Описание отсутствует.'}</p>
                    <div class="details">
                        <div class="detail-item"><strong>Дата:</strong> <span>${new Date(event.source_date).toLocaleDateString('ru-RU')}</span></div>
                        <div class="detail-item"><strong>Локация:</strong> <span>${event.location_normalized || 'Не указано'}</span></div>
                        <div class="detail-item"><strong>Источник:</strong> <span>${event.information_source_type || 'Не указан'}</span></div>
                        <div class="detail-item"><strong>Уверенность:</strong> <span>${event.confidence || 'Не указана'}</span></div>
                    </div>
                `;
                eventsContainer.appendChild(card);
            });
        }
        
        // Обновляем счетчик результатов
        resultsCounter.textContent = `Найдено событий: ${eventsToRender.length}`;
    }

    // --- Запуск приложения ---
    initDashboard();

});