---
description: Тестирование защищённого эндпоинта с JWT токеном
argument-hint: Путь эндпоинта (напр., /api/v2/auth/me или /api/v2/auth/oauth/linked)
---

Тестирование аутентифицированного эндпоинта в Nareshka с корректной обработкой JWT токена.

## Процесс

### Шаг 1: Определить метод аутентификации

Проверь, требует ли эндпоинт аутентификации:
- OAuth эндпоинты: `GET /api/v2/auth/oauth/google`, `POST /api/v2/auth/oauth/telegram`
- Защищённые эндпоинты: `GET /api/v2/auth/oauth/linked`, `DELETE /api/v2/auth/oauth/{provider}/unlink`
- Публичные эндпоинты: `POST /api/v2/auth/register`, `POST /api/v2/auth/login`

### Шаг 2: Получить JWT токен

**Вариант A: Использование существующего тестового пользователя**
```bash
curl -X POST http://localhost:4000/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@nareshka.dev",
    "password": "test1234"
  }'
```

Ответ:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "test@nareshka.dev",
    "username": "test_user"
  }
}
```

**Вариант B: Создание нового тестового пользователя (при необходимости)**
```bash
curl -X POST http://localhost:4000/api/v2/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newtest@nareshka.dev",
    "password": "newtest1234",
    "username": "newtest"
  }'
```

Затем авторизуйся для получения токена.

### Шаг 3: Тестирование эндпоинта

**Пример: Тест /api/v2/auth/oauth/linked**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:4000$ARGUMENTS \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

Ожидаемый ответ (200 OK):
```json
[
  {
    "provider": "google",
    "provider_email": "user@gmail.com",
    "created_at": "2025-01-15T10:30:00"
  }
]
```

### Шаг 4: Отчёт о результатах

Задокументируй:
- ✅ HTTP статус код (200, 401, 403, 404 и т.д.)
- ✅ Тело ответа (JSON)
- ✅ Заголовки ответа (если релевантно)
- ✅ Любые ошибки или неожиданное поведение
- ✅ Истечение срока токена (если встретилось)

## Типичные сценарии

### Тестирование OAuth эндпоинтов

**Инициация Google OAuth:**
```bash
curl -X GET http://localhost:4000/api/v2/auth/oauth/google -v
```

Ожидается: 307 Редирект на экран согласия Google

**Telegram OAuth:**
```bash
curl -X POST http://localhost:4000/api/v2/auth/oauth/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123456789,
    "first_name": "Test",
    "username": "testuser",
    "auth_date": 1677123456,
    "hash": "abc123..."
  }'
```

Ожидается: 200 OK с JWT токеном

### Тестирование защищённых эндпоинтов

**Получить текущего пользователя (требуется токен):**
```bash
curl -X GET http://localhost:4000/api/v2/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Отвязать OAuth аккаунт:**
```bash
curl -X DELETE http://localhost:4000/api/v2/auth/oauth/google/unlink \
  -H "Authorization: Bearer $TOKEN"
```

### Отладка неудачных тестов

**401 Unauthorized - токен невалиден/истёк:**
- Сгенерируй новый токен
- Проверь формат токена (должен начинаться с "ey")
- Проверь заголовок Authorization: `Authorization: Bearer <token>`

**403 Forbidden - у пользователя нет прав:**
- Проверь роль пользователя (admin, user и т.д.)
- Убедись, что у эндпоинта корректные проверки прав
- Проверь, существует ли конкретный OAuth аккаунт

**404 Not Found:**
- Убедись, что путь эндпоинта соответствует OpenAPI спецификации
- Проверь, существует ли ресурс (напр., OAuth аккаунт с провайдером)

## Шаблон скрипта

```bash
#!/bin/bash

# Конфигурация
BASE_URL="http://localhost:4000"
TEST_EMAIL="test@nareshka.dev"
TEST_PASSWORD="test1234"
ENDPOINT=$ARGUMENTS

# Получение токена
TOKEN=$(curl -s -X POST "$BASE_URL/api/v2/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }" | jq -r '.access_token')

if [[ -z "$TOKEN" ]] || [[ "$TOKEN" == "null" ]]; then
  echo "ОШИБКА: Не удалось получить токен авторизации"
  exit 1
fi

echo "Токен: $TOKEN"
echo ""
echo "Тестирование: $ENDPOINT"
echo ""

# Тест эндпоинта
curl -v -X GET "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

## Ключевые эндпоинты для тестирования

| Эндпоинт | Метод | Аутентификация | Назначение |
|----------|-------|----------------|------------|
| /api/v2/auth/login | POST | Нет | Получить JWT токен |
| /api/v2/auth/me | GET | Да | Получить текущего пользователя |
| /api/v2/auth/oauth/google | GET | Нет | Начать Google OAuth |
| /api/v2/auth/oauth/linked | GET | Да | Список привязанных аккаунтов |
| /api/v2/auth/oauth/{provider}/unlink | DELETE | Да | Отвязать аккаунт |

Начинаю тестирование эндпоинта: $ARGUMENTS
