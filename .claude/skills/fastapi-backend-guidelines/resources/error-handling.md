# Паттерны обработки ошибок

## Структурированная обработка ошибок в роутах

```python
from fastapi import HTTPException
from app.core.logging import get_logger

logger = get_logger(__name__)

@router.post("/posts")
async def create_post(request: CreatePostRequest, service: PostService = Depends(...)):
    try:
        post = await service.create_post(request)
        return post
    except ValueError as e:
        # Ошибка бизнес-логики (400)
        logger.warning("Ошибка валидации", extra={"error": str(e), "request": request.model_dump()})
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        # Ошибка авторизации (403)
        logger.warning("Доступ запрещён", extra={"error": str(e)})
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    except Exception as e:
        # Неожиданная ошибка (500)
        logger.error("Неожиданная ошибка при создании поста", exc_info=True, extra={"request": request.model_dump()})
        raise HTTPException(status_code=500, detail="Internal server error")
```

## HTTP статус-коды

| Код | Название | Когда использовать |
|-----|----------|-------------------|
| 200 | OK | Успешный GET, PUT |
| 201 | Created | Успешный POST |
| 204 | No Content | Успешный DELETE |
| 400 | Bad Request | Ошибка валидации, невалидные данные |
| 401 | Unauthorized | Не аутентифицирован |
| 403 | Forbidden | Аутентифицирован, но не авторизован |
| 404 | Not Found | Ресурс не найден |
| 409 | Conflict | Ресурс уже существует |
| 422 | Unprocessable Entity | Ошибка валидации (Pydantic) |
| 500 | Internal Server Error | Неожиданная ошибка сервера |

## Кастомные классы исключений

```python
# back/app/core/exceptions.py
class AppException(Exception):
    """Базовое исключение приложения."""
    def __init__(self, message: str, code: str = None):
        self.message = message
        self.code = code
        super().__init__(message)

class NotFoundError(AppException):
    """Ресурс не найден."""
    pass

class ValidationError(AppException):
    """Ошибка валидации."""
    pass

class AuthenticationError(AppException):
    """Ошибка аутентификации."""
    pass

class AuthorizationError(AppException):
    """Ошибка авторизации."""
    pass

class ConflictError(AppException):
    """Конфликт ресурса."""
    pass
```

## Глобальный обработчик исключений

```python
# back/app/core/error_handlers.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.core.exceptions import (
    NotFoundError, ValidationError, AuthenticationError,
    AuthorizationError, ConflictError
)
from app.core.logging import get_logger

logger = get_logger(__name__)

def setup_exception_handlers(app: FastAPI):
    @app.exception_handler(NotFoundError)
    async def not_found_handler(request: Request, exc: NotFoundError):
        return JSONResponse(
            status_code=404,
            content={"detail": exc.message, "code": exc.code}
        )

    @app.exception_handler(ValidationError)
    async def validation_handler(request: Request, exc: ValidationError):
        logger.warning("Ошибка валидации", extra={"error": exc.message})
        return JSONResponse(
            status_code=400,
            content={"detail": exc.message, "code": exc.code}
        )

    @app.exception_handler(AuthenticationError)
    async def auth_handler(request: Request, exc: AuthenticationError):
        return JSONResponse(
            status_code=401,
            content={"detail": exc.message}
        )

    @app.exception_handler(AuthorizationError)
    async def authz_handler(request: Request, exc: AuthorizationError):
        return JSONResponse(
            status_code=403,
            content={"detail": exc.message}
        )

    @app.exception_handler(ConflictError)
    async def conflict_handler(request: Request, exc: ConflictError):
        return JSONResponse(
            status_code=409,
            content={"detail": exc.message}
        )

    @app.exception_handler(Exception)
    async def generic_handler(request: Request, exc: Exception):
        logger.error("Необработанное исключение", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
```

## Использование в сервисах

```python
from app.core.exceptions import NotFoundError, ValidationError, ConflictError

class UserService:
    async def create_user(self, request: CreateUserRequest) -> UserResponse:
        # Проверить существует ли email
        existing = await self.user_repository.get_by_email(request.email)
        if existing:
            raise ConflictError("Пользователь с таким email уже существует", code="EMAIL_EXISTS")

        # Валидация сложности пароля
        if len(request.password) < 8:
            raise ValidationError("Пароль должен содержать минимум 8 символов", code="WEAK_PASSWORD")

        user = await self.user_repository.create(...)
        return UserResponse.model_validate(user)

    async def get_user(self, user_id: int) -> UserResponse:
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise NotFoundError(f"Пользователь {user_id} не найден", code="USER_NOT_FOUND")
        return UserResponse.model_validate(user)
```
