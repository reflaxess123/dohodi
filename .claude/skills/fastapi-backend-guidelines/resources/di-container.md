# Dependency Injection контейнер

## Регистрация сервисов

```python
# back/app/shared/di/container.py (уже существует)
# Использование при инициализации фичи:

from app.shared.di.container import DIContainer, create_service_dependency

# Во время запуска приложения (в main.py или __init__ фичи):
def setup_post_services(container: DIContainer):
    """Зарегистрировать сервисы постов в DI контейнере."""
    from app.features.posts.services.post_service import PostService
    from app.features.posts.repositories.post_repository import PostRepository

    # Регистрация репозитория (transient - новый экземпляр на каждый запрос)
    container.register_transient(PostRepository, PostRepository)

    # Регистрация сервиса (transient)
    container.register_transient(PostService, PostService)
```

## Использование в роутах

```python
# В роутере:
from app.shared.di.container import create_service_dependency

@router.post("/")
async def create_post(
    request: CreatePostRequest,
    post_service: PostService = Depends(create_service_dependency(PostService))
):
    return await post_service.create_post(request)
```

## Реализация контейнера

```python
# back/app/shared/di/container.py
from typing import Type, TypeVar, Callable, Dict, Any
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database.session import get_db

T = TypeVar('T')

class DIContainer:
    """Простой dependency injection контейнер."""

    _services: Dict[Type, Callable] = {}

    @classmethod
    def register_transient(cls, interface: Type[T], implementation: Type[T]):
        """Зарегистрировать сервис, создающий новый экземпляр на каждый запрос."""
        cls._services[interface] = implementation

    @classmethod
    def resolve(cls, interface: Type[T], db: AsyncSession) -> T:
        """Разрешить экземпляр сервиса."""
        if interface not in cls._services:
            raise ValueError(f"Сервис {interface} не зарегистрирован")

        implementation = cls._services[interface]

        # Проверить параметры конструктора
        import inspect
        sig = inspect.signature(implementation)
        kwargs = {}

        for param_name, param in sig.parameters.items():
            param_type = param.annotation

            if param_type == AsyncSession:
                kwargs[param_name] = db
            elif param_type in cls._services:
                # Рекурсивно разрешить зависимости
                kwargs[param_name] = cls.resolve(param_type, db)

        return implementation(**kwargs)

def create_service_dependency(service_class: Type[T]) -> Callable:
    """Создать FastAPI зависимость для сервиса."""
    def dependency(db: AsyncSession = Depends(get_db)) -> T:
        return DIContainer.resolve(service_class, db)
    return dependency
```

## Регистрация в main.py

```python
# back/main.py
from fastapi import FastAPI
from app.shared.di.container import DIContainer

# Импорт функций настройки фич
from app.features.posts.setup import setup_post_services
from app.features.auth.setup import setup_auth_services
from app.features.interviews.setup import setup_interview_services

app = FastAPI()

# Настройка DI контейнера
container = DIContainer()
setup_post_services(container)
setup_auth_services(container)
setup_interview_services(container)
```

## Паттерн настройки фичи

```python
# back/app/features/posts/setup.py
from app.shared.di.container import DIContainer

def setup_post_services(container: DIContainer):
    """Зарегистрировать все сервисы связанные с постами."""
    from app.features.posts.services.post_service import PostService
    from app.features.posts.repositories.post_repository import PostRepository

    container.register_transient(PostRepository, PostRepository)
    container.register_transient(PostService, PostService)

# back/app/features/posts/__init__.py
from app.features.posts.api.post_router import router
from app.features.posts.setup import setup_post_services

__all__ = ['router', 'setup_post_services']
```
