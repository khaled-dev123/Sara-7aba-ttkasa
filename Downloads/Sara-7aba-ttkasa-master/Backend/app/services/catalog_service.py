from sqlalchemy.orm import Session

from app.errors import ConflictError, NotFoundError
from app.models import Category, Market, MarketUser, Product, Supplier, User, UserRoleEntry
from app.models.enums import UserRole
from app.repositories.catalog import (
    CategoryRepository,
    MarketRepository,
    ProductRepository,
    SupplierRepository,
)
from app.repositories.users import MarketUserRepository, UserRoleRepository, UserRepository
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.schemas.market import MarketCreate, MarketUpdate
from app.schemas.product import ProductCreate, ProductUpdate
from app.schemas.supplier import SupplierCreate, SupplierUpdate
from app.security import hash_password
from app.services.audit_service import AuditService


class MarketService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = MarketRepository(db)
        self.users = UserRepository(db)
        self.market_users = MarketUserRepository(db)
        self.user_roles = UserRoleRepository(db)

    def create(self, payload: MarketCreate) -> Market:
        market_data = payload.model_dump(exclude={"username", "password"})
        market = self.repo.create(Market(**market_data))

        email = f"{payload.username}@market.local"
        user = User(
            username=payload.username,
            email=email,
            password_hash=hash_password(payload.password),
            role=UserRole.market,
        )
        self.users.create(user)
        self.market_users.create(MarketUser(user_id=user.id, market_id=market.id))
        self.user_roles.create(UserRoleEntry(
            user_id=user.id,
            role=UserRole.market.value,
            market_id=market.id,
        ))

        return market

    def update(self, market_id: int, payload: MarketUpdate) -> Market:
        market = self.repo.get_or_404(market_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(market, field, value)
        return self.repo.save(market)

    def list(self, only_active: bool = False) -> list[Market]:
        if only_active:
            return self.repo.filter_by(is_active=True)
        return self.repo.list_all()


class CategoryService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CategoryRepository(db)

    def create(self, payload: CategoryCreate) -> Category:
        if self.repo.filter_by(name=payload.name):
            raise ConflictError(f"Category '{payload.name}' already exists")
        return self.repo.create(Category(**payload.model_dump()))

    def update(self, category_id: int, payload: CategoryUpdate) -> Category:
        category = self.repo.get_or_404(category_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(category, field, value)
        return self.repo.save(category)


class SupplierService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = SupplierRepository(db)

    def create(self, payload: SupplierCreate) -> Supplier:
        return self.repo.create(Supplier(**payload.model_dump()))

    def update(self, supplier_id: int, payload: SupplierUpdate) -> Supplier:
        supplier = self.repo.get_or_404(supplier_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(supplier, field, value)
        return self.repo.save(supplier)


class ProductService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProductRepository(db)
        self.categories = CategoryRepository(db)
        self.suppliers = SupplierRepository(db)
        self.audit = AuditService(db)

    def _validate_fks(self, category_id: int, supplier_id: int) -> None:
        if self.categories.get(category_id) is None:
            raise NotFoundError(f"Category {category_id} not found")
        if self.suppliers.get(supplier_id) is None:
            raise NotFoundError(f"Supplier {supplier_id} not found")

    def create(self, payload: ProductCreate, actor_id: int | None = None) -> Product:
        if self.repo.filter_by(sku=payload.sku):
            raise ConflictError(f"SKU '{payload.sku}' already exists")
        self._validate_fks(payload.category_id, payload.supplier_id)
        product = self.repo.create(Product(**payload.model_dump()))
        self.audit.log_product_created(
            product.id,
            actor_id,
            sku=product.sku,
            name=product.name,
            initial_stock=product.current_stock,
        )
        return product

    def update(self, product_id: int, payload: ProductUpdate, actor_id: int | None = None) -> Product:
        product = self.repo.get_or_404(product_id)
        data = payload.model_dump(exclude_unset=True)
        if "sku" in data and data["sku"] != product.sku:
            if self.repo.filter_by(sku=data["sku"]):
                raise ConflictError(f"SKU '{data['sku']}' already exists")
        if "category_id" in data and data["category_id"] != product.category_id:
            self._validate_fks(data["category_id"], product.supplier_id)
        if "supplier_id" in data and data["supplier_id"] != product.supplier_id:
            self._validate_fks(product.category_id, data["supplier_id"])
        for field, value in data.items():
            setattr(product, field, value)
        self.audit.log_product_updated(product_id, actor_id, changes=data)
        return self.repo.save(product)
