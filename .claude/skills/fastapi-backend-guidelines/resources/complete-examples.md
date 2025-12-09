# Полные примеры фич - Nareshka Backend

## Полная фича: Управление блог-постами

Полный пример создания фичи с нуля в проекте Nareshka.

---

## 1. SQLAlchemy модель

```python
# back/app/shared/models/post_models.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.shared.database.base import Base

class Post(Base):
    """Модель поста."""
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    content = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Связи
    user = relationship("User", back_populates="posts")
    category = relationship("Category", back_populates="posts")
```

---

## 2. Alembic миграция

```bash
cd back
alembic revision --autogenerate -m "Add posts table"
alembic upgrade head
```

Сгенерированная миграция:

```python
# back/alembic/versions/xxx_add_posts_table.py
"""Add posts table

Revision ID: xxx
Revises: yyy
Create Date: 2025-11-23
"""
from alembic import op
import sqlalchemy as sa

def upgrade() -> None:
    op.create_table(
        'posts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_posts_id'), 'posts', ['id'], unique=False)
    op.create_index(op.f('ix_posts_title'), 'posts', ['title'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_posts_title'), table_name='posts')
    op.drop_index(op.f('ix_posts_id'), table_name='posts')
    op.drop_table('posts')
```

---

## 3. Pydantic DTO

```python
# back/app/features/posts/dto/post_dto.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

# Request DTO
class CreatePostRequest(BaseModel):
    """Запрос на создание поста."""
    title: str = Field(..., min_length=1, max_length=200, description="Заголовок поста")
    content: str = Field(..., min_length=1, description="Содержимое поста")
    category_id: Optional[int] = Field(None, description="ID категории")

    @field_validator('title')
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Заголовок не может быть пустым или состоять из пробелов')
        return v.strip()

    @field_validator('content')
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Содержимое не может быть пустым')
        return v.strip()

class UpdatePostRequest(BaseModel):
    """Запрос на обновление поста."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    category_id: Optional[int] = None

class PostFilterRequest(BaseModel):
    """Запрос фильтрации постов."""
    category_id: Optional[int] = None
    user_id: Optional[int] = None
    search: Optional[str] = Field(None, max_length=100)

# Response DTO
class PostResponse(BaseModel):
    """Ответ поста."""
    id: int
    title: str
    content: str
    user_id: int
    category_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class PostListResponse(BaseModel):
    """Ответ с пагинированными постами."""
    posts: List[PostResponse]
    total: int
    skip: int
    limit: int
```

---

## 4. Репозиторий

```python
# back/app/features/posts/repositories/post_repository.py
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.shared.database.base_repository import BaseRepository
from app.shared.models.post_models import Post

class PostRepository(BaseRepository[Post]):
    """Репозиторий постов."""

    def __init__(self, db: AsyncSession):
        super().__init__(Post, db)

    async def get_by_user(self, user_id: int, skip: int = 0, limit: int = 10) -> List[Post]:
        """Получить посты по ID пользователя."""
        stmt = select(self.model).filter(
            self.model.user_id == user_id
        ).offset(skip).limit(limit).order_by(self.model.created_at.desc())

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_category(self, category_id: int, skip: int = 0, limit: int = 10) -> List[Post]:
        """Получить посты по категории."""
        stmt = select(self.model).filter(
            self.model.category_id == category_id
        ).offset(skip).limit(limit).order_by(self.model.created_at.desc())

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def search(
        self,
        query: str,
        category_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 10
    ) -> List[Post]:
        """Поиск постов по заголовку или содержимому."""
        stmt = select(self.model).filter(
            or_(
                self.model.title.ilike(f"%{query}%"),
                self.model.content.ilike(f"%{query}%")
            )
        )

        if category_id:
            stmt = stmt.filter(self.model.category_id == category_id)

        stmt = stmt.offset(skip).limit(limit).order_by(self.model.created_at.desc())

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_user(self, user_id: int) -> int:
        """Подсчитать посты пользователя."""
        stmt = select(func.count()).select_from(self.model).filter(
            self.model.user_id == user_id
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0
```

---

## 5. Сервис

```python
# back/app/features/posts/services/post_service.py
from typing import List, Optional

from app.features.posts.dto.post_dto import (
    CreatePostRequest,
    UpdatePostRequest,
    PostResponse,
    PostListResponse
)
from app.features.posts.repositories.post_repository import PostRepository
from app.core.logging import get_logger

logger = get_logger(__name__)

class PostService:
    """Сервис постов с бизнес-логикой."""

    def __init__(self, post_repository: PostRepository):
        self.post_repository = post_repository

    async def create_post(self, request: CreatePostRequest, user_id: int) -> PostResponse:
        """Создать новый пост."""
        logger.info("Создание поста", extra={
            "user_id": user_id,
            "title": request.title
        })

        post_data = {
            "title": request.title,
            "content": request.content,
            "user_id": user_id,
            "category_id": request.category_id
        }

        post = await self.post_repository.create(post_data)

        logger.info("Пост создан", extra={"post_id": post.id})
        return PostResponse.model_validate(post)

    async def get_post(self, post_id: int) -> Optional[PostResponse]:
        """Получить пост по ID."""
        post = await self.post_repository.get_by_id(post_id)
        if not post:
            return None
        return PostResponse.model_validate(post)

    async def get_user_posts(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 10
    ) -> PostListResponse:
        """Получить посты пользователя с пагинацией."""
        posts = await self.post_repository.get_by_user(user_id, skip, limit)
        total = await self.post_repository.count_by_user(user_id)

        return PostListResponse(
            posts=[PostResponse.model_validate(p) for p in posts],
            total=total,
            skip=skip,
            limit=limit
        )

    async def update_post(
        self,
        post_id: int,
        request: UpdatePostRequest,
        user_id: int
    ) -> Optional[PostResponse]:
        """Обновить пост (только владелец)."""
        post = await self.post_repository.get_by_id(post_id)

        if not post:
            return None

        if post.user_id != user_id:
            raise PermissionError("Вы можете обновлять только свои посты")

        update_data = request.model_dump(exclude_unset=True)
        updated_post = await self.post_repository.update(post_id, update_data)

        logger.info("Пост обновлён", extra={"post_id": post_id, "user_id": user_id})
        return PostResponse.model_validate(updated_post)

    async def delete_post(self, post_id: int, user_id: int) -> bool:
        """Удалить пост (только владелец)."""
        post = await self.post_repository.get_by_id(post_id)

        if not post:
            return False

        if post.user_id != user_id:
            raise PermissionError("Вы можете удалять только свои посты")

        await self.post_repository.delete(post_id)

        logger.info("Пост удалён", extra={"post_id": post_id, "user_id": user_id})
        return True
```

---

## 6. Роутер (API)

```python
# back/app/features/posts/api/post_router.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List

from app.features.posts.dto.post_dto import (
    CreatePostRequest,
    UpdatePostRequest,
    PostResponse,
    PostListResponse
)
from app.features.posts.services.post_service import PostService
from app.shared.dependencies.auth import get_current_user
from app.shared.models.user_models import User
from app.shared.di.container import create_service_dependency

router = APIRouter(prefix="/posts", tags=["posts"])

@router.post("/", response_model=PostResponse, status_code=201)
async def create_post(
    request: CreatePostRequest,
    current_user: User = Depends(get_current_user),
    post_service: PostService = Depends(create_service_dependency(PostService))
):
    """
    Создать новый пост.

    - **title**: Заголовок поста (обязательно)
    - **content**: Содержимое поста (обязательно)
    - **category_id**: ID категории (опционально)
    """
    try:
        return await post_service.create_post(request, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/me", response_model=PostListResponse)
async def get_my_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    post_service: PostService = Depends(create_service_dependency(PostService))
):
    """Получить свои посты с пагинацией."""
    return await post_service.get_user_posts(current_user.id, skip, limit)

@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: int,
    post_service: PostService = Depends(create_service_dependency(PostService))
):
    """Получить пост по ID."""
    post = await post_service.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    return post

@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    request: UpdatePostRequest,
    current_user: User = Depends(get_current_user),
    post_service: PostService = Depends(create_service_dependency(PostService))
):
    """Обновить пост (только владелец)."""
    try:
        post = await post_service.update_post(post_id, request, current_user.id)
        if not post:
            raise HTTPException(status_code=404, detail="Пост не найден")
        return post
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{post_id}", status_code=204)
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    post_service: PostService = Depends(create_service_dependency(PostService))
):
    """Удалить пост (только владелец)."""
    try:
        deleted = await post_service.delete_post(post_id, current_user.id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Пост не найден")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
```

---

## 7. Регистрация DI

```python
# back/app/features/posts/__init__.py
from app.shared.di.container import DIContainer

def setup_di(container: DIContainer):
    """Зарегистрировать сервисы постов в DI контейнере."""
    from app.features.posts.services.post_service import PostService
    from app.features.posts.repositories.post_repository import PostRepository

    container.register_transient(PostRepository, PostRepository)
    container.register_transient(PostService, PostService)
```

```python
# back/main.py (добавить при инициализации приложения)
from app.features.posts import setup_di as setup_posts_di
from app.features.posts.api.post_router import router as post_router

# Настройка DI
setup_posts_di(di_container)

# Подключение роутера
app.include_router(post_router, prefix="/api/v2")
```

---

## 8. Тесты

```python
# back/app/features/posts/tests/test_post_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime

from app.features.posts.services.post_service import PostService
from app.features.posts.dto.post_dto import CreatePostRequest
from app.shared.models.post_models import Post

@pytest.fixture
def mock_repository():
    return AsyncMock()

@pytest.fixture
def post_service(mock_repository):
    return PostService(post_repository=mock_repository)

@pytest.mark.asyncio
async def test_create_post_success(post_service, mock_repository):
    # Подготовка
    request = CreatePostRequest(
        title="Test Post",
        content="Test content",
        category_id=None
    )
    user_id = 1

    mock_post = MagicMock(spec=Post)
    mock_post.id = 1
    mock_post.title = "Test Post"
    mock_post.content = "Test content"
    mock_post.user_id = user_id
    mock_post.category_id = None
    mock_post.created_at = datetime.now()
    mock_post.updated_at = datetime.now()

    mock_repository.create.return_value = mock_post

    # Действие
    result = await post_service.create_post(request, user_id)

    # Проверка
    assert result.title == "Test Post"
    assert result.content == "Test content"
    mock_repository.create.assert_called_once()

@pytest.mark.asyncio
async def test_update_post_permission_denied(post_service, mock_repository):
    # Подготовка
    post_id = 1
    user_id = 2  # Другой пользователь
    request = UpdatePostRequest(title="Updated")

    mock_post = MagicMock(spec=Post)
    mock_post.user_id = 1  # Оригинальный владелец

    mock_repository.get_by_id.return_value = mock_post

    # Действие и проверка
    with pytest.raises(PermissionError):
        await post_service.update_post(post_id, request, user_id)
```

---

## 9. Полная структура файлов

```
back/app/features/posts/
├── __init__.py                    # Регистрация DI
├── api/
│   └── post_router.py             # FastAPI роутер
├── dto/
│   └── post_dto.py                # Pydantic схемы
├── services/
│   └── post_service.py            # Бизнес-логика
├── repositories/
│   └── post_repository.py         # Доступ к данным
└── tests/
    ├── test_post_service.py       # Тесты сервиса
    ├── test_post_repository.py    # Тесты репозитория
    └── test_post_router.py        # Тесты API

back/app/shared/models/
└── post_models.py                  # SQLAlchemy модель

back/alembic/versions/
└── xxx_add_posts_table.py          # Миграция
```

---

## 10. Пример использования (cURL)

```bash
# Создать пост
curl -X POST http://localhost:4000/api/v2/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Мой первый пост",
    "content": "Это содержимое",
    "category_id": 1
  }'

# Получить свои посты
curl http://localhost:4000/api/v2/posts/me?skip=0&limit=10 \
  -H "Authorization: Bearer <token>"

# Получить пост по ID
curl http://localhost:4000/api/v2/posts/1

# Обновить пост
curl -X PUT http://localhost:4000/api/v2/posts/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Обновлённый заголовок"
  }'

# Удалить пост
curl -X DELETE http://localhost:4000/api/v2/posts/1 \
  -H "Authorization: Bearer <token>"
```

---

**Это полная, готовая к продакшену фича, следующая всем паттернам Nareshka!**
