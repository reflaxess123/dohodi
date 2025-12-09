# Библиотека готовых паттернов

Готовые к использованию regex и glob паттерны для триггеров скиллов. Копируйте и настраивайте под свои скиллы.

---

## Паттерны намерений (Regex)

### Создание функций/эндпоинтов
```regex
(add|create|implement|build).*?(feature|endpoint|route|service|controller)
```

### Создание компонентов
```regex
(create|add|make|build).*?(component|UI|page|modal|dialog|form)
```

### Работа с базой данных
```regex
(add|create|modify|update).*?(user|table|column|field|schema|migration)
(database|prisma).*?(change|update|query)
```

### Обработка ошибок
```regex
(fix|handle|catch|debug).*?(error|exception|bug)
(add|implement).*?(try|catch|error.*?handling)
```

### Запросы объяснений
```regex
(how does|how do|explain|what is|describe|tell me about).*?
```

### Операции с workflow
```regex
(create|add|modify|update).*?(workflow|step|branch|condition)
(debug|troubleshoot|fix).*?workflow
```

### Тестирование
```regex
(write|create|add).*?(test|spec|unit.*?test)
```

---

## Паттерны путей файлов (Glob)

### Фронтенд
```glob
frontend/src/**/*.tsx        # Все React компоненты
frontend/src/**/*.ts         # Все TypeScript файлы
frontend/src/components/**   # Только директория components
```

### Бэкенд сервисы
```glob
form/src/**/*.ts            # Form сервис
email/src/**/*.ts           # Email сервис
users/src/**/*.ts           # Users сервис
projects/src/**/*.ts        # Projects сервис
```

### База данных
```glob
**/schema.prisma            # Prisma схема (в любом месте)
**/migrations/**/*.sql      # Файлы миграций
database/src/**/*.ts        # Скрипты базы данных
```

### Workflow
```glob
form/src/workflow/**/*.ts              # Движок workflow
form/src/workflow-definitions/**/*.json # Определения workflow
```

### Исключения тестов
```glob
**/*.test.ts                # TypeScript тесты
**/*.test.tsx               # Тесты React компонентов
**/*.spec.ts                # Spec файлы
```

---

## Паттерны контента (Regex)

### Prisma/База данных
```regex
import.*[Pp]risma                # Импорты Prisma
PrismaService                    # Использование PrismaService
prisma\.                         # prisma.something
\.findMany\(                     # Методы запросов Prisma
\.create\(
\.update\(
\.delete\(
```

### Контроллеры/Маршруты
```regex
export class.*Controller         # Классы контроллеров
router\.                         # Express router
app\.(get|post|put|delete|patch) # Маршруты Express app
```

### Обработка ошибок
```regex
try\s*\{                        # Блоки try
catch\s*\(                      # Блоки catch
throw new                        # Операторы throw
```

### React/Компоненты
```regex
export.*React\.FC               # React функциональные компоненты
export default function.*       # Экспорты функций по умолчанию
useState|useEffect              # React хуки
```

---

**Пример использования:**

```json
{
  "my-skill": {
    "promptTriggers": {
      "intentPatterns": [
        "(create|add|build).*?(component|UI|page)"
      ]
    },
    "fileTriggers": {
      "pathPatterns": [
        "frontend/src/**/*.tsx"
      ],
      "contentPatterns": [
        "export.*React\\.FC",
        "useState|useEffect"
      ]
    }
  }
}
```

---

**Связанные файлы:**
- [SKILL.md](SKILL.md) - Главное руководство по скиллам
- [TRIGGER_TYPES.md](TRIGGER_TYPES.md) - Детальная документация по триггерам
- [SKILL_RULES_REFERENCE.md](SKILL_RULES_REFERENCE.md) - Полная схема
