# Паттерны DTO - Pydantic схемы

## Request/Response DTO

```python
# back/app/features/posts/dto/post_dto.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

# Request DTO
class CreatePostRequest(BaseModel):
    """Схема запроса для создания поста."""
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    category_id: Optional[int] = None

    @field_validator('title')
    @classmethod
    def title_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Заголовок не может быть пустым')
        return v.strip()

class UpdatePostRequest(BaseModel):
    """Схема запроса для обновления поста."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    category_id: Optional[int] = None

# Response DTO
class PostResponse(BaseModel):
    """Схема ответа для поста."""
    id: int
    title: str
    content: str
    category_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}  # Pydantic v2

class PostListResponse(BaseModel):
    """Схема ответа для пагинированных постов."""
    posts: List[PostResponse]
    total: int
    skip: int
    limit: int
```

## Чек-лист паттернов

- ✅ Разделять Request и Response DTO
- ✅ Использовать `Field()` для ограничений валидации
- ✅ Кастомные валидаторы с `@field_validator`
- ✅ `model_config = {"from_attributes": True}` для SQLAlchemy
- ✅ Опциональные поля для обновлений
- ✅ Docstrings для каждой схемы

## Продвинутые валидаторы

```python
from pydantic import field_validator, model_validator
import re

class UserCreateRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=8)
    password_confirm: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', v):
            raise ValueError('Неверный формат email')
        return v.lower()

    @model_validator(mode='after')
    def passwords_match(self):
        if self.password != self.password_confirm:
            raise ValueError('Пароли не совпадают')
        return self
```

## Вложенные DTO

```python
class CategoryResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}

class PostWithCategoryResponse(BaseModel):
    id: int
    title: str
    content: str
    category: Optional[CategoryResponse]

    model_config = {"from_attributes": True}
```

## Enum в DTO

```python
from enum import Enum

class PostStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class PostResponse(BaseModel):
    id: int
    title: str
    status: PostStatus

    model_config = {"from_attributes": True}
```
