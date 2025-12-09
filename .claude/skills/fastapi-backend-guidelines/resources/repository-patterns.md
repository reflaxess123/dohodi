# Паттерны репозитория

## Репозиторий с BaseRepository

```python
# back/app/features/posts/repositories/post_repository.py
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from app.shared.database.base_repository import BaseRepository
from app.shared.models.content_models import ContentBlock, ContentCategory

class PostRepository(BaseRepository[ContentBlock]):
    """Репозиторий для доступа к данным постов."""

    def __init__(self, db: AsyncSession):
        super().__init__(ContentBlock, db)

    async def get_by_category(self, category_id: int) -> List[ContentBlock]:
        """Получить все посты в категории."""
        stmt = select(self.model).filter(self.model.category_id == category_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_category(self, category_id: int) -> Optional[ContentCategory]:
        """Получить категорию по ID."""
        stmt = select(ContentCategory).filter(ContentCategory.id == category_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def search_by_title(self, query: str) -> List[ContentBlock]:
        """Поиск постов по заголовку."""
        stmt = select(self.model).filter(
            self.model.title.ilike(f"%{query}%")
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_with_category(self, post_id: int) -> Optional[ContentBlock]:
        """Получить пост с загруженной связью категории."""
        from sqlalchemy.orm import selectinload

        stmt = (
            select(self.model)
            .options(selectinload(self.model.category))
            .filter(self.model.id == post_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
```

## Чек-лист паттернов

- ✅ Наследоваться от `BaseRepository[Model]`
- ✅ Конструктор принимает `AsyncSession`
- ✅ Доменно-специфичные методы запросов
- ✅ Использовать синтаксис SQLAlchemy 2.0 (`select()`)
- ✅ Type hints для всех методов
- ✅ Использовать `selectinload` для eager loading связей

## Реализация BaseRepository

```python
# back/app/shared/database/base_repository.py
from typing import TypeVar, Generic, Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

T = TypeVar('T')

class BaseRepository(Generic[T]):
    """Базовый репозиторий с общими CRUD операциями."""

    def __init__(self, model: type[T], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: int) -> Optional[T]:
        stmt = select(self.model).filter(self.model.id == id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        stmt = select(self.model).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create(self, data: Dict[str, Any]) -> T:
        instance = self.model(**data)
        self.db.add(instance)
        await self.db.commit()
        await self.db.refresh(instance)
        return instance

    async def update(self, id: int, data: Dict[str, Any]) -> Optional[T]:
        stmt = (
            update(self.model)
            .where(self.model.id == id)
            .values(**data)
            .returning(self.model)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.scalar_one_or_none()

    async def delete(self, id: int) -> bool:
        stmt = delete(self.model).where(self.model.id == id)
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0

    async def count(self) -> int:
        from sqlalchemy import func
        stmt = select(func.count()).select_from(self.model)
        result = await self.db.execute(stmt)
        return result.scalar()
```

## Сложные запросы

```python
class PostRepository(BaseRepository[Post]):

    async def get_posts_with_filters(
        self,
        category_id: Optional[int] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 10
    ) -> List[Post]:
        """Получить посты с несколькими фильтрами."""
        stmt = select(self.model)

        if category_id:
            stmt = stmt.filter(self.model.category_id == category_id)
        if status:
            stmt = stmt.filter(self.model.status == status)
        if search:
            stmt = stmt.filter(self.model.title.ilike(f"%{search}%"))

        stmt = stmt.order_by(self.model.created_at.desc())
        stmt = stmt.offset(skip).limit(limit)

        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_posts_count_by_category(self) -> List[Dict]:
        """Получить количество постов сгруппированных по категории."""
        from sqlalchemy import func

        stmt = (
            select(
                self.model.category_id,
                func.count(self.model.id).label('count')
            )
            .group_by(self.model.category_id)
        )
        result = await self.db.execute(stmt)
        return [{"category_id": row[0], "count": row[1]} for row in result.all()]
```
