# Паттерны работы с базой данных - SQLAlchemy & Alembic

## Создание миграции

```bash
# После добавления/изменения SQLAlchemy моделей:
cd back
alembic revision --autogenerate -m "Add posts table"
alembic upgrade head
```

## Пример файла миграции

```python
# back/alembic/versions/xxx_add_posts_table.py
"""Add posts table

Revision ID: xxx
Revises: yyy
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# идентификаторы ревизии
revision = 'xxx'
down_revision = 'yyy'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'posts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='draft'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_posts_title', 'posts', ['title'])
    op.create_index('ix_posts_category_id', 'posts', ['category_id'])

def downgrade() -> None:
    op.drop_index('ix_posts_category_id', table_name='posts')
    op.drop_index('ix_posts_title', table_name='posts')
    op.drop_table('posts')
```

## SQLAlchemy модель

```python
# back/app/shared/models/content_models.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.shared.database.base import Base

class Post(Base):
    __tablename__ = 'posts'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    content = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey('categories.id', ondelete='SET NULL'), nullable=True, index=True)
    status = Column(String(20), nullable=False, default='draft')
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # Связи
    category = relationship("Category", back_populates="posts")

class Category(Base):
    __tablename__ = 'categories'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)

    # Связи
    posts = relationship("Post", back_populates="category")
```

## Типичные операции миграции

```python
# Добавить колонку
op.add_column('posts', sa.Column('slug', sa.String(200), nullable=True))

# Удалить колонку
op.drop_column('posts', 'slug')

# Добавить индекс
op.create_index('ix_posts_slug', 'posts', ['slug'], unique=True)

# Удалить индекс
op.drop_index('ix_posts_slug', table_name='posts')

# Добавить внешний ключ
op.create_foreign_key(
    'fk_posts_author',
    'posts', 'users',
    ['author_id'], ['id'],
    ondelete='CASCADE'
)

# Миграция данных
from sqlalchemy.sql import table, column
posts = table('posts', column('status', sa.String))
op.execute(posts.update().values(status='published').where(posts.c.status == None))

# Изменить тип колонки
op.alter_column('posts', 'status',
    existing_type=sa.String(20),
    type_=sa.String(50),
    existing_nullable=False
)
```

## Сессия базы данных

```python
# back/app/shared/database/session.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.settings import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

## Полезные команды Alembic

```bash
# Проверить текущую ревизию
alembic current

# Посмотреть историю миграций
alembic history

# Откатить одну ревизию
alembic downgrade -1

# Откатить до конкретной ревизии
alembic downgrade abc123

# Обновить до конкретной ревизии
alembic upgrade abc123

# Создать пустую миграцию
alembic revision -m "manual migration"

# Отметить базу как текущую ревизию (без запуска миграции)
alembic stamp head
```
