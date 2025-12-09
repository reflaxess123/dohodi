---
name: fastapi-backend-guidelines
description: Полное руководство по бэкенд-разработке для проекта Nareshka на FastAPI/Python/SQLAlchemy. Используй при создании роутов, сервисов, репозиториев, работе с FastAPI роутерами, SQLAlchemy моделями, Pydantic схемами, DI контейнером, Alembic миграциями или реализации фич. Охватывает Feature-First архитектуру, Dependency Injection, Repository Pattern, Service Layer, DTO паттерны, обработку ошибок и специфичные паттерны Nareshka.
---

# Руководство по FastAPI бэкенд-разработке - Nareshka

## Назначение

Обеспечить консистентность и лучшие практики во всём бэкенде Nareshka с использованием Feature-First архитектуры на стеке FastAPI/Python/SQLAlchemy.

## Когда использовать этот скилл

Автоматически активируется при работе над:
- Созданием или модификацией API роутов, эндпоинтов
- Написанием сервисов, репозиториев
- Реализацией новых фич в `back/app/features/`
- Работой с SQLAlchemy моделями и Alembic миграциями
- Валидацией Pydantic схем
- Настройкой Dependency Injection контейнера
- Тестированием и рефакторингом бэкенда

---

## Быстрый старт (чек-листы)

### Чек-лист новой фичи

- [ ] **Модуль фичи**: Создать в `back/app/features/feature_name/`
- [ ] **Роутер**: FastAPI роутер с определениями роутов
- [ ] **DTO**: Pydantic схемы для запросов/ответов
- [ ] **Сервис**: Бизнес-логика с DI
- [ ] **Репозиторий**: Доступ к данным (если нужен)
- [ ] **Модели**: SQLAlchemy модели (если новые сущности)
- [ ] **Миграция**: Alembic миграция для изменений БД
- [ ] **Тесты**: Unit + интеграционные тесты
- [ ] **Регистрация**: Зарегистрировать в DI контейнере и главном роутере

### Чек-лист нового эндпоинта

- [ ] **Роут**: Чистое определение в роутере, делегирование сервису
- [ ] **Request DTO**: Pydantic схема для валидации
- [ ] **Response DTO**: Pydantic схема для вывода
- [ ] **Метод сервиса**: Бизнес-логика
- [ ] **Обработка ошибок**: Try/catch с правильными HTTP исключениями
- [ ] **Логирование**: Структурированное логирование с контекстом
- [ ] **Тесты**: Тест-кейсы

---

## Обзор архитектуры

### Feature-First структура

```
back/app/
├── features/           # Доменные модули (14 фич)
│   ├── auth/
│   │   ├── api/            # Роутеры
│   │   ├── dto/            # Pydantic схемы
│   │   ├── services/       # Бизнес-логика
│   │   ├── repositories/   # Доступ к данным
│   │   └── tests/          # Тесты
│   ├── interviews/
│   ├── code_editor/
│   └── ...
├── shared/             # Общие компоненты
│   ├── database/       # Подключение к БД, базовый репозиторий
│   ├── dependencies/   # FastAPI зависимости
│   ├── di/            # DI Контейнер ⭐
│   ├── middleware/    # CORS, сессии, логирование
│   ├── models/        # SQLAlchemy модели
│   ├── schemas/       # Общие Pydantic схемы
│   └── utils/
└── core/              # Ядро приложения
    ├── settings.py    # Pydantic настройки
    ├── logging.py     # Структурированное логирование
    └── error_handlers.py

main.py                # Точка входа FastAPI приложения
```

### Слоистая архитектура для каждой фичи

```
HTTP Запрос
    ↓
Роутер (только маршрутизация)
    ↓
Сервис (бизнес-логика + DI)
    ↓
Репозиторий (доступ к данным)
    ↓
SQLAlchemy Модель
    ↓
PostgreSQL База данных
```

**Ключевой принцип:** Каждый слой имеет ОДНУ ответственность.

---

## Структура директорий для фичи

```
features/feature_name/
├── api/
│   └── feature_router.py       # FastAPI роутер
├── dto/
│   ├── feature_dto.py          # Схемы запросов/ответов
│   └── feature_response_dto.py # Отдельные DTO ответов
├── services/
│   └── feature_service.py      # Бизнес-логика
├── repositories/
│   └── feature_repository.py   # Доступ к данным
├── tests/
│   ├── test_api.py
│   ├── test_service.py
│   └── test_repository.py
└── __init__.py
```

**Соглашения по именованию:**
- Роутеры: `feature_router.py` с `router = APIRouter()`
- Сервисы: `feature_service.py` с классом `FeatureService`
- Репозитории: `feature_repository.py` с классом `FeatureRepository`
- DTO: `feature_dto.py` с `CreateFeatureRequest`, `FeatureResponse`

---

## Сводка основных паттернов

### 1. Паттерн роутера
- Использовать `APIRouter` с prefix и tags
- Инжектить сервисы через `create_service_dependency()`
- Делегировать всю логику сервисному слою
- Обрабатывать исключения с правильными HTTP статус-кодами

→ См. `resources/router-patterns.md` для полных примеров

### 2. Паттерн DTO (Pydantic)
- Разделять Request и Response DTO
- Использовать `Field()` для ограничений валидации
- Кастомные валидаторы с `@field_validator`
- `model_config = {"from_attributes": True}` для SQLAlchemy

→ См. `resources/dto-patterns.md` для полных примеров

### 3. Сервисный слой
- Инжекция через конструктор репозиториев
- Валидация бизнес-логики
- Структурированное логирование с контекстом
- Возвращать DTO, не модели

→ См. `resources/service-patterns.md` для полных примеров

### 4. Паттерн репозитория
- Наследоваться от `BaseRepository[Model]`
- Конструктор принимает `AsyncSession`
- Доменно-специфичные методы запросов
- Использовать синтаксис SQLAlchemy 2.0 (`select()`)

→ См. `resources/repository-patterns.md` для полных примеров

### 5. DI Контейнер
- Регистрировать сервисы и репозитории
- Использовать `create_service_dependency()` в роутах

→ См. `resources/di-container.md` для полных примеров

### 6. Обработка ошибок
- `ValueError` → 400 Bad Request
- `PermissionError` → 403 Forbidden
- `Exception` → 500 Internal Error
- Всегда логировать ошибки с контекстом

→ См. `resources/error-handling.md` для полных примеров

### 7. Alembic миграции
- `alembic revision --autogenerate -m "description"`
- `alembic upgrade head`
- Всегда тестировать путь downgrade

→ См. `resources/database-patterns.md` для полных примеров

### 8. Тестирование
- Использовать pytest + AsyncMock
- Тестировать сервисы с замоканными репозиториями
- Интеграционные тесты для API эндпоинтов

→ См. `resources/testing-guide.md` для полных примеров

---

## Справочник HTTP статус-кодов

| Код | Название | Когда использовать |
|-----|----------|-------------------|
| 200 | OK | Успешный GET, PUT |
| 201 | Created | Успешный POST |
| 204 | No Content | Успешный DELETE |
| 400 | Bad Request | Ошибка валидации |
| 401 | Unauthorized | Не аутентифицирован |
| 403 | Forbidden | Аутентифицирован, но не авторизован |
| 404 | Not Found | Ресурс не найден |
| 500 | Internal Error | Неожиданная ошибка сервера |

---

## Быстрый справочник

**Создать новую фичу:**
1. `mkdir -p back/app/features/feature_name/{api,dto,services,repositories,tests}`
2. Создать роутер, DTO, сервис, репозиторий
3. Зарегистрировать в DI контейнере
4. Подключить роутер в main.py
5. Создать миграцию если нужно
6. Написать тесты

**Именование файлов:**
- Роутеры: `feature_router.py`
- Сервисы: `feature_service.py`
- Репозитории: `feature_repository.py`
- DTO: `feature_dto.py`
- Тесты: `test_*.py`

**Паттерны импортов:**
```python
# Фичи
from app.features.feature_name.api.router import router
from app.features.feature_name.dto.dto import RequestDTO, ResponseDTO
from app.features.feature_name.services.service import Service

# Общие
from app.shared.database.session import get_db
from app.shared.di.container import create_service_dependency
from app.shared.models.user_models import User
from app.core.settings import settings
from app.core.logging import get_logger
```

---

## Ресурсы (прогрессивное раскрытие)

Для детальных паттернов и полных примеров кода см.:
- `resources/router-patterns.md` - Детали реализации роутеров
- `resources/dto-patterns.md` - Pydantic схемы и валидация
- `resources/service-patterns.md` - Паттерны сервисного слоя
- `resources/repository-patterns.md` - Репозиторий и доступ к БД
- `resources/di-container.md` - Настройка Dependency Injection
- `resources/error-handling.md` - Паттерны обработки ошибок
- `resources/database-patterns.md` - SQLAlchemy и Alembic
- `resources/testing-guide.md` - Стратегии тестирования
- `resources/complete-examples.md` - Полные примеры фич

---

**Помни:** Следуй Feature-First архитектуре, используй DI контейнер, валидируй с Pydantic, тестируй тщательно!
