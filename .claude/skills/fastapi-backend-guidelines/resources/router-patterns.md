# Паттерны роутеров - FastAPI

## Базовая структура роутера

```python
# back/app/features/posts/api/post_router.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.features.posts.dto.post_dto import CreatePostRequest, PostResponse
from app.features.posts.services.post_service import PostService
from app.shared.di.container import create_service_dependency

router = APIRouter(prefix="/posts", tags=["posts"])

@router.post("/", response_model=PostResponse, status_code=201)
async def create_post(
    request: CreatePostRequest,
    post_service: PostService = Depends(create_service_dependency(PostService))
):
    """Создать новый пост."""
    try:
        post = await post_service.create_post(request)
        return post
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/", response_model=List[PostResponse])
async def get_posts(
    skip: int = 0,
    limit: int = 10,
    post_service: PostService = Depends(create_service_dependency(PostService))
):
    """Получить список постов с пагинацией."""
    return await post_service.get_posts(skip=skip, limit=limit)

@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: int,
    post_service: PostService = Depends(create_service_dependency(PostService))
):
    """Получить пост по ID."""
    post = await post_service.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    request: UpdatePostRequest,
    post_service: PostService = Depends(create_service_dependency(PostService))
):
    """Обновить пост по ID."""
    try:
        post = await post_service.update_post(post_id, request)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        return post
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{post_id}", status_code=204)
async def delete_post(
    post_id: int,
    post_service: PostService = Depends(create_service_dependency(PostService))
):
    """Удалить пост по ID."""
    deleted = await post_service.delete_post(post_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Post not found")
```

## Чек-лист паттернов

- ✅ Использовать `APIRouter` с prefix и tags
- ✅ Инжектить сервисы через `create_service_dependency()`
- ✅ Request/Response используют Pydantic схемы
- ✅ Правильные HTTP статус-коды (201, 404, 400, 500)
- ✅ Try/catch с конкретными исключениями
- ✅ Docstrings для каждого эндпоинта
- ✅ Делегировать ВСЮ бизнес-логику сервису

## Роутер с аутентификацией

```python
from app.shared.dependencies.auth import get_current_user
from app.shared.models.user_models import User

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/", response_model=PostResponse, status_code=201)
async def create_post(
    request: CreatePostRequest,
    current_user: User = Depends(get_current_user),
    post_service: PostService = Depends(create_service_dependency(PostService))
):
    """Создать новый пост (аутентифицированный)."""
    return await post_service.create_post(request, user_id=current_user.id)
```

## Паттерн пагинации

```python
from fastapi import Query

@router.get("/", response_model=PaginatedResponse)
async def get_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    service: Service = Depends(...)
):
    items = await service.get_all(skip=skip, limit=limit)
    total = await service.count()
    return PaginatedResponse(items=items, total=total, skip=skip, limit=limit)
```

## Регистрация роутера фичи

```python
# back/main.py
from app.features.posts.api.post_router import router as post_router

app.include_router(post_router, prefix="/api/v2")
```
