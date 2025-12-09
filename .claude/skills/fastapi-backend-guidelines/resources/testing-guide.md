# Руководство по тестированию

## Тесты сервисов

```python
# back/app/features/posts/tests/test_post_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime

from app.features.posts.services.post_service import PostService
from app.features.posts.dto.post_dto import CreatePostRequest, PostResponse

@pytest.fixture
def mock_repository():
    return AsyncMock()

@pytest.fixture
def post_service(mock_repository):
    return PostService(post_repository=mock_repository)

@pytest.mark.asyncio
async def test_create_post_success(post_service, mock_repository):
    # Подготовка
    request = CreatePostRequest(title="Test", content="Content", category_id=None)
    mock_repository.create.return_value = MagicMock(
        id=1,
        title="Test",
        content="Content",
        category_id=None,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )

    # Действие
    result = await post_service.create_post(request)

    # Проверка
    assert result.title == "Test"
    assert result.id == 1
    mock_repository.create.assert_called_once()

@pytest.mark.asyncio
async def test_create_post_with_invalid_category(post_service, mock_repository):
    # Подготовка
    request = CreatePostRequest(title="Test", content="Content", category_id=999)
    mock_repository.get_category.return_value = None

    # Действие и проверка
    with pytest.raises(ValueError, match="Категория 999 не найдена"):
        await post_service.create_post(request)

@pytest.mark.asyncio
async def test_get_post_not_found(post_service, mock_repository):
    # Подготовка
    mock_repository.get_by_id.return_value = None

    # Действие
    result = await post_service.get_post(999)

    # Проверка
    assert result is None
    mock_repository.get_by_id.assert_called_once_with(999)
```

## Интеграционные тесты API

```python
# back/app/features/posts/tests/test_post_api.py
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from main import app
from app.shared.database.session import get_db

@pytest.fixture
async def client(db_session: AsyncSession):
    """Создать тестовый клиент с переопределённой базой данных."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_create_post(client: AsyncClient):
    # Подготовка
    post_data = {
        "title": "Test Post",
        "content": "Test content"
    }

    # Действие
    response = await client.post("/api/v2/posts/", json=post_data)

    # Проверка
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Post"
    assert "id" in data

@pytest.mark.asyncio
async def test_create_post_validation_error(client: AsyncClient):
    # Подготовка - пустой заголовок
    post_data = {
        "title": "",
        "content": "Test content"
    }

    # Действие
    response = await client.post("/api/v2/posts/", json=post_data)

    # Проверка
    assert response.status_code == 422  # Валидация Pydantic

@pytest.mark.asyncio
async def test_get_post_not_found(client: AsyncClient):
    # Действие
    response = await client.get("/api/v2/posts/99999")

    # Проверка
    assert response.status_code == 404
```

## Тесты репозиториев

```python
# back/app/features/posts/tests/test_post_repository.py
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.posts.repositories.post_repository import PostRepository
from app.shared.models.content_models import Post

@pytest.fixture
def repository(db_session: AsyncSession):
    return PostRepository(db_session)

@pytest.mark.asyncio
async def test_create_post(repository: PostRepository):
    # Действие
    post = await repository.create({
        "title": "Test Post",
        "content": "Test content"
    })

    # Проверка
    assert post.id is not None
    assert post.title == "Test Post"

@pytest.mark.asyncio
async def test_get_by_id(repository: PostRepository, db_session: AsyncSession):
    # Подготовка
    post = Post(title="Test", content="Content")
    db_session.add(post)
    await db_session.commit()

    # Действие
    result = await repository.get_by_id(post.id)

    # Проверка
    assert result is not None
    assert result.title == "Test"

@pytest.mark.asyncio
async def test_search_by_title(repository: PostRepository, db_session: AsyncSession):
    # Подготовка
    posts = [
        Post(title="Python Tutorial", content="..."),
        Post(title="JavaScript Guide", content="..."),
        Post(title="Advanced Python", content="...")
    ]
    db_session.add_all(posts)
    await db_session.commit()

    # Действие
    results = await repository.search_by_title("Python")

    # Проверка
    assert len(results) == 2
```

## Конфигурация тестов

```python
# back/conftest.py
import pytest
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.shared.database.base import Base

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest.fixture
async def db_session(engine):
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
        await session.rollback()
```

## Запуск тестов

```bash
# Запустить все тесты
pytest

# Запустить с покрытием
pytest --cov=app --cov-report=html

# Запустить конкретный файл теста
pytest app/features/posts/tests/test_post_service.py

# Запустить конкретный тест
pytest app/features/posts/tests/test_post_service.py::test_create_post_success

# Запустить с подробным выводом
pytest -v

# Запустить только отмеченные тесты
pytest -m "asyncio"
```
