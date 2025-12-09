# Паттерны сервисного слоя

## Сервис с DI

```python
# back/app/features/posts/services/post_service.py
from typing import List, Optional

from app.features.posts.dto.post_dto import CreatePostRequest, UpdatePostRequest, PostResponse
from app.features.posts.repositories.post_repository import PostRepository
from app.shared.models.content_models import ContentBlock
from app.core.logging import get_logger

logger = get_logger(__name__)

class PostService:
    """Сервис для бизнес-логики постов."""

    def __init__(self, post_repository: PostRepository):
        self.post_repository = post_repository

    async def create_post(self, request: CreatePostRequest) -> PostResponse:
        """Создать новый пост."""
        logger.info("Создание поста", extra={"title": request.title})

        # Бизнес-валидация
        if request.category_id:
            category = await self.post_repository.get_category(request.category_id)
            if not category:
                logger.warning("Категория не найдена", extra={"category_id": request.category_id})
                raise ValueError(f"Категория {request.category_id} не найдена")

        # Создание поста
        post = await self.post_repository.create({
            "title": request.title,
            "content": request.content,
            "category_id": request.category_id
        })

        logger.info("Пост создан", extra={"post_id": post.id})
        return PostResponse.model_validate(post)

    async def get_posts(self, skip: int = 0, limit: int = 10) -> List[PostResponse]:
        """Получить пагинированные посты."""
        posts = await self.post_repository.get_all(skip=skip, limit=limit)
        return [PostResponse.model_validate(post) for post in posts]

    async def get_post(self, post_id: int) -> Optional[PostResponse]:
        """Получить пост по ID."""
        post = await self.post_repository.get_by_id(post_id)
        if not post:
            return None
        return PostResponse.model_validate(post)

    async def update_post(self, post_id: int, request: UpdatePostRequest) -> Optional[PostResponse]:
        """Обновить пост по ID."""
        post = await self.post_repository.get_by_id(post_id)
        if not post:
            return None

        update_data = request.model_dump(exclude_unset=True)
        updated_post = await self.post_repository.update(post_id, update_data)

        logger.info("Пост обновлён", extra={"post_id": post_id})
        return PostResponse.model_validate(updated_post)

    async def delete_post(self, post_id: int) -> bool:
        """Удалить пост по ID."""
        deleted = await self.post_repository.delete(post_id)
        if deleted:
            logger.info("Пост удалён", extra={"post_id": post_id})
        return deleted
```

## Чек-лист паттернов

- ✅ Инжекция через конструктор репозиториев
- ✅ Валидация бизнес-логики
- ✅ Структурированное логирование с контекстом
- ✅ Возвращать DTO, не модели
- ✅ Использовать `model_validate()` для Pydantic v2
- ✅ Обрабатывать граничные случаи (не найден, невалидные данные)

## Сервис с несколькими репозиториями

```python
class OrderService:
    def __init__(
        self,
        order_repository: OrderRepository,
        product_repository: ProductRepository,
        user_repository: UserRepository
    ):
        self.order_repository = order_repository
        self.product_repository = product_repository
        self.user_repository = user_repository

    async def create_order(self, request: CreateOrderRequest, user_id: int) -> OrderResponse:
        # Проверить существование пользователя
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise ValueError("Пользователь не найден")

        # Проверить существование продуктов и рассчитать итог
        total = 0
        for item in request.items:
            product = await self.product_repository.get_by_id(item.product_id)
            if not product:
                raise ValueError(f"Продукт {item.product_id} не найден")
            total += product.price * item.quantity

        # Создать заказ
        order = await self.order_repository.create({
            "user_id": user_id,
            "total": total,
            "items": request.items
        })

        return OrderResponse.model_validate(order)
```

## Сервис с внешним API

```python
import httpx

class PaymentService:
    def __init__(self, payment_repository: PaymentRepository):
        self.payment_repository = payment_repository
        self.api_url = settings.PAYMENT_API_URL
        self.api_key = settings.PAYMENT_API_KEY

    async def process_payment(self, amount: int, user_id: int) -> PaymentResponse:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/charge",
                json={"amount": amount},
                headers={"Authorization": f"Bearer {self.api_key}"}
            )

            if response.status_code != 200:
                logger.error("Ошибка платежа", extra={"status": response.status_code})
                raise ValueError("Ошибка обработки платежа")

            payment_data = response.json()

        # Сохранить в базу данных
        payment = await self.payment_repository.create({
            "user_id": user_id,
            "amount": amount,
            "external_id": payment_data["id"],
            "status": "completed"
        })

        return PaymentResponse.model_validate(payment)
```
