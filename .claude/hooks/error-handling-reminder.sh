#!/bin/bash
# Error Handling Reminder Hook - мягкое напоминание после редактирования
# Запускается в Stop event, анализирует изменённые файлы на "рискованные" паттерны

set -e

session_id="${CLAUDE_SESSION_ID:-default}"
cache_dir="$CLAUDE_PROJECT_DIR/.claude/tsc-cache/${session_id}"

# Выход если нет кэша (файлы не редактировались)
if [[ ! -d "$cache_dir" ]] || [[ ! -f "$cache_dir/edited-files.log" ]]; then
    exit 0
fi

# Читаем список изменённых файлов за последние 5 минут
now=$(date +%s)
five_min_ago=$((now - 300))

recent_files=""
backend_files=0
frontend_files=0
risky_patterns_found=false

while IFS=':' read -r timestamp filepath repo; do
    # Пропускаем старые записи
    if [[ "$timestamp" -lt "$five_min_ago" ]]; then
        continue
    fi

    recent_files="${recent_files}${filepath}\n"

    # Считаем файлы по типу
    if [[ "$repo" == "back" ]]; then
        ((backend_files++)) || true
    elif [[ "$repo" == "front" ]]; then
        ((frontend_files++)) || true
    fi
done < "$cache_dir/edited-files.log"

# Выход если нет недавних изменений
if [[ -z "$recent_files" ]]; then
    exit 0
fi

# Анализируем файлы на рискованные паттерны
risky_backend=false
risky_frontend=false
risky_details=""

# Проверяем backend файлы
if [[ $backend_files -gt 0 ]]; then
    while IFS=':' read -r timestamp filepath repo; do
        if [[ "$repo" != "back" ]] || [[ "$timestamp" -lt "$five_min_ago" ]]; then
            continue
        fi

        if [[ -f "$filepath" ]]; then
            # Проверяем рискованные паттерны в Python
            if grep -q "try:" "$filepath" 2>/dev/null; then
                risky_backend=true
                risky_details="${risky_details}  - try/except блок в $(basename "$filepath")\n"
            fi
            if grep -q "async def" "$filepath" 2>/dev/null; then
                risky_backend=true
                risky_details="${risky_details}  - async функция в $(basename "$filepath")\n"
            fi
            if grep -qE "(execute|query|commit|session)" "$filepath" 2>/dev/null; then
                risky_backend=true
                risky_details="${risky_details}  - DB операция в $(basename "$filepath")\n"
            fi
            if grep -q "@router\." "$filepath" 2>/dev/null; then
                risky_backend=true
                risky_details="${risky_details}  - API endpoint в $(basename "$filepath")\n"
            fi
        fi
    done < "$cache_dir/edited-files.log"
fi

# Проверяем frontend файлы
if [[ $frontend_files -gt 0 ]]; then
    while IFS=':' read -r timestamp filepath repo; do
        if [[ "$repo" != "front" ]] || [[ "$timestamp" -lt "$five_min_ago" ]]; then
            continue
        fi

        if [[ -f "$filepath" ]]; then
            # Проверяем рискованные паттерны в TypeScript/React
            if grep -q "catch" "$filepath" 2>/dev/null; then
                risky_frontend=true
                risky_details="${risky_details}  - try/catch блок в $(basename "$filepath")\n"
            fi
            if grep -qE "(useQuery|useMutation|fetch)" "$filepath" 2>/dev/null; then
                risky_frontend=true
                risky_details="${risky_details}  - API вызов в $(basename "$filepath")\n"
            fi
            if grep -qE "(useEffect|useState)" "$filepath" 2>/dev/null; then
                risky_frontend=true
                risky_details="${risky_details}  - React hook в $(basename "$filepath")\n"
            fi
        fi
    done < "$cache_dir/edited-files.log"
fi

# Если нашли рискованные паттерны - выводим напоминание
if [[ "$risky_backend" == "true" ]] || [[ "$risky_frontend" == "true" ]]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 ERROR HANDLING SELF-CHECK"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    if [[ "$risky_backend" == "true" ]]; then
        echo "⚠️  Backend Changes Detected ($backend_files file(s) edited)"
        echo ""
        echo "❓ Вопросы для самопроверки:"
        echo "   • Добавлена ли обработка ошибок в try/except?"
        echo "   • Используется ли logger.error() в catch блоках?"
        echo "   • Правильно ли обрабатываются DB транзакции?"
        echo "   • Возвращает ли API правильные HTTP статусы?"
        echo ""
        echo "💡 Backend Best Practices:"
        echo "   • Все ошибки должны логироваться с контекстом"
        echo "   • HTTPException для клиентских ошибок (400, 404)"
        echo "   • Не глотать исключения без логирования"
        echo ""
    fi

    if [[ "$risky_frontend" == "true" ]]; then
        echo "⚠️  Frontend Changes Detected ($frontend_files file(s) edited)"
        echo ""
        echo "❓ Вопросы для самопроверки:"
        echo "   • Обработаны ли error states в React Query?"
        echo "   • Есть ли Loading/Error UI для пользователя?"
        echo "   • Правильно ли настроены зависимости useEffect?"
        echo "   • Есть ли Error Boundary для критических компонентов?"
        echo ""
        echo "💡 Frontend Best Practices:"
        echo "   • Используй isError/error из React Query"
        echo "   • Показывай пользователю понятные сообщения"
        echo "   • Не забывай про loading states"
        echo ""
    fi

    echo "📝 Обнаруженные паттерны:"
    echo -e "$risky_details"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
fi

exit 0
