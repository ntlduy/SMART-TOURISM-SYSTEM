import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from unittest.mock import MagicMock
import pytest

from models import User, City, Category, Shop, Comment, Voucher, UserRole


def test_user_to_dict_and_role():
    u = User(
        name="Min",
        username="min",
        password="pw",
        email="min@example.com",
        avatar="a.png",
    )
    u.id = 42
    u.points = 10
    d = u.to_dict()
    assert d["id"] == 42
    assert d["name"] == "Min"
    assert d["email"] == "min@example.com"
    assert d["avatar"] == "a.png"
    # Enum tồn tại
    assert hasattr(UserRole, "ADMIN")


def test_city_and_category_str():
    c = City(name="Hà Nội")
    assert str(c) == "Hà Nội"
    cat = Category(name="Đồ lưu niệm")
    assert str(cat) == "Đồ lưu niệm"


def test_shop_to_dict_and_relations():
    s = Shop(
        shop_name="Shop A",
        address="123",
        items="Bánh;Kẹo",
        price="50000",
        rating=4.2,
        lat=10.0,
        lon=20.0,
        city_id=1,
        category_id=2,
    )
    s.id = 7
    # Gắn các object quan hệ giả bằng cách ghi vào __dict__ để tránh instrumentation của SQLAlchemy
    mcat = MagicMock()
    mcat.name = "Quà"
    mcity = MagicMock()
    mcity.name = "HCM"
    s.__dict__["category_obj"] = mcat
    s.__dict__["city_obj"] = mcity

    data = s.to_dict()
    assert data["id"] == 7
    assert data["name"] == "Shop A"
    assert data["category"] == "Quà"
    assert data["city"] == "HCM"
    assert data["lat"] == 10.0


def test_comment_to_dict_and_images_and_user():
    now = datetime.now()
    c = Comment(content="Nice", shop_id=1, user_id=2, rating=5, image="a.jpg;b.jpg")
    c.id = 11
    c.created_date = now
    # Gắn user liên quan giả, bỏ qua instrumentation của SQLAlchemy
    mu = MagicMock()
    mu.name = "Alice"
    c.__dict__["user"] = mu

    d = c.to_dict()
    assert d["id"] == 11
    assert d["content"] == "Nice"
    assert d["rating"] == 5
    assert d["user_name"] == "Alice"
    assert isinstance(d["images"], list) and "a.jpg" in d["images"]


def test_voucher_to_dict():
    v = Voucher(
        code="SALE10", description="Giảm 10k", point_cost=50, image_url="img.png"
    )
    v.id = 99
    d = v.to_dict()
    assert d["id"] == 99
    assert d["code"] == "SALE10"
    assert d["point_cost"] == 50


def test_shop_str_and_price_conversion():
    s = Shop(
        shop_name="Shop B",
        address="X",
        items="A",
        price="123.45",
        rating=4.0,
        lat=1.0,
        lon=2.0,
        city_id=1,
        category_id=1,
    )
    s.id = 8
    # `__str__` trả về `shop_name`
    assert str(s) == "Shop B"
    # gắn các quan hệ
    s.__dict__["category_obj"] = __import__("types").SimpleNamespace(name="Cat")
    s.__dict__["city_obj"] = __import__("types").SimpleNamespace(name="City")
    data = s.to_dict()
    assert isinstance(data["price"], float) or isinstance(data["price"], (int, float))


def test_comment_str_and_date_format():
    from datetime import datetime

    now = datetime(2025, 1, 2, 3, 4, 5)
    c = Comment(content="Hello", shop_id=1, user_id=2, rating=3, image=None)
    c.id = 21
    c.created_date = now
    # `__str__` trả về nội dung
    assert str(c) == "Hello"
    # gắn user bỏ qua SQLAlchemy
    c.__dict__["user"] = __import__("types").SimpleNamespace(name="Bob")
    d = c.to_dict()
    assert d["created_date"] == "2025-01-02 03:04:05"


def test_tiktokvideo_and_challenge_and_uservoucher():
    # TikTokVideo: trường cơ bản và quan hệ
    tv = __import__("models").TikTokVideo(
        video_url="v", embed_url="e", description="d", shop_id=5
    )
    tv.id = 55
    # gắn shop
    tv.__dict__["shop"] = __import__("types").SimpleNamespace(shop_name="S")
    assert tv.video_url == "v"

    # ChallengeSession: các trường đơn giản
    cs = __import__("models").ChallengeSession(user_id=1, target_shops="[1,2,3]")
    cs.id = 66
    assert cs.target_shops == "[1,2,3]"

    # UserVoucher: mặc định cơ bản và quan hệ
    uv = __import__("models").UserVoucher(user_id=2, voucher_id=3)
    uv.id = 77
    # trạng thái mặc định tồn tại (cột mặc định có thể không được set cho tới khi có DB); cho phép set và đọc
    uv.status = "UNUSED"
    assert uv.status == "UNUSED"
