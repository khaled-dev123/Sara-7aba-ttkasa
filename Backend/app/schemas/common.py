from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


def paginate(items: list[T], total: int, page: int, page_size: int) -> Page[T]:
    pages = (total + page_size - 1) // page_size if page_size else 0
    return Page(items=items, total=total, page=page, page_size=page_size, pages=pages)


def clamp_page(page: int, page_size: int) -> tuple[int, int]:
    return max(1, page), min(100, max(1, page_size))
