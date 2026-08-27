from app.models import Category, Market, Product, Supplier
from app.repositories.base import BaseRepository


class MarketRepository(BaseRepository[Market]):
    model = Market


class CategoryRepository(BaseRepository[Category]):
    model = Category


class SupplierRepository(BaseRepository[Supplier]):
    model = Supplier


class ProductRepository(BaseRepository[Product]):
    model = Product
