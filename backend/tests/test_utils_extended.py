import os
import sys
import json
import types
from unittest.mock import MagicMock
import hashlib
import json
import os
import sys
import types
import hashlib
from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import utils


class SimpleUser:
    def __init__(self, id=1, name="U", email="u@example.com"):
        self.id = id
        self.name = name
        self.email = email
        self.reset_code = None
        self.code_expiration = None
        self.password = None


class DummyShop:
    def __init__(self, id=1, lat=0.0, lon=0.0):
        self.id = id
        self.lat = lat
        self.lon = lon
        self.items = "X"
        self.price = "100"
        self.rating = 0
        self.shop_name = f"S{id}"

    def to_dict(self):
        return {"id": self.id}


class DummyField:
    def __init__(self, name=None):
        self.name = name

    def __eq__(self, other):
        return ("EQ", self.name, other)


def test_get_gemini_response_client_false():
    orig_client = utils.client
    utils.client = False
    try:
        res = utils.get_gemini_response("hello")
        assert res == {"answer": "Lỗi AI.", "shop_ids": []}
    finally:
        utils.client = orig_client


def test_get_gemini_response_parsing(monkeypatch):
    # Kích hoạt client để dùng trong test
    monkeypatch.setattr(utils, "client", True)

    class FakeResp:
        def __init__(self, text):
            self.text = text

    class FakeModel:
        def __init__(self, name):
            pass

        def generate_content(self, prompt):
            # Nếu prompt chứa 'trích xuất' -> giai đoạn phân tích intent
            if "trích xuất" in prompt:
                return FakeResp('{"keyword":"bánh","city":null,"is_searching":true}')
            return FakeResp('{"answer":"OK","shop_ids":[7]}')

    monkeypatch.setattr(utils.genai, "GenerativeModel", FakeModel)

    # Giả lập `search_shops_from_db` trả về danh sách chứa id 7 và các thuộc tính cần thiết
    class S:
        def __init__(self):
            self.id = 7
            self.items = "Banh"
            self.shop_name = "X"
            self.address = "addr"
            self.price = "100"
            self.city_obj = types.SimpleNamespace(name="HCM")

    monkeypatch.setattr(
        utils, "search_shops_from_db", lambda keywords, city, limit: [S()]
    )

    res = utils.get_gemini_response("muốn mua bánh", chat_history=[])
    assert res.get("answer") == "OK"
    assert res.get("shop_ids") == [7]


def test_generate_and_send_reset_code_success(monkeypatch):
    user = SimpleUser(42, name="Min")
    monkeypatch.setattr(utils, "get_user_by_id", lambda uid: user)

    # giả lập phiên làm việc DB
    class DummySession:
        def commit(self):
            return None

        def rollback(self):
            return None

    m = MagicMock()
    m.session = DummySession()
    monkeypatch.setattr(utils, "db", m)

    sent = {"called": False}

    class DummyMail:
        def send(self, msg):
            sent["called"] = True

    monkeypatch.setattr(utils, "mail", DummyMail())

    ok = utils.generate_and_send_reset_code(user.id)
    assert ok is True
    assert user.reset_code is not None
    assert user.code_expiration is not None


def test_generate_and_send_reset_code_no_user(monkeypatch):
    monkeypatch.setattr(utils, "get_user_by_id", lambda uid: None)
    ok = utils.generate_and_send_reset_code(9999)
    assert ok is False


def test_generate_and_send_reset_code_mail_failure(monkeypatch):
    user = SimpleUser(3)
    monkeypatch.setattr(utils, "get_user_by_id", lambda uid: user)

    class DummySession:
        def commit(self):
            return None

        def rollback(self):
            self.rolled = True

    sess = DummySession()
    m = MagicMock()
    m.session = sess
    monkeypatch.setattr(utils, "db", m)

    class BrokenMail:
        def send(self, msg):
            raise Exception("SMTP fail")

    monkeypatch.setattr(utils, "mail", BrokenMail())

    ok = utils.generate_and_send_reset_code(user.id)
    assert ok is False


def test_verify_reset_code_and_update_password(monkeypatch):
    user = SimpleUser(10)
    user.reset_code = "123456"
    user.code_expiration = datetime.now() + timedelta(minutes=5)

    monkeypatch.setattr(utils, "get_user_by_id", lambda uid: user)

    assert utils.verify_reset_code(user.id, "123456") is True
    assert utils.verify_reset_code(user.id, "000000") is False

    # expired
    user.code_expiration = datetime.now() - timedelta(minutes=1)
    assert utils.verify_reset_code(user.id, "123456") is False

    # update password
    user.code_expiration = datetime.now() + timedelta(minutes=5)
    m = MagicMock()
    m.session = types.SimpleNamespace(commit=lambda: None)
    monkeypatch.setattr(utils, "db", m)
    ok = utils.update_password(user.id, "newpass")
    assert ok is True
    expected = hashlib.md5("newpass".strip().encode("utf-8")).hexdigest()
    assert user.password == expected
    assert user.reset_code is None
    assert user.code_expiration is None


def test_check_login_and_add_user(monkeypatch):
    # Chuẩn bị dummy user và object query
    user = SimpleUser(55)
    raw_password = "mypw"
    hashed = hashlib.md5(raw_password.strip().encode("utf-8")).hexdigest()
    user.password = hashed
    user.username = "me"

    class DummyQuery:
        def __init__(self, res):
            self._res = res

        def filter(self, *args, **kwargs):
            return self

        def first(self):
            return self._res

    # Cung cấp thuộc tính username/password được `check_login` sử dụng
    # Tạo lớp User có thể khởi tạo với các thuộc tính và constructor mà `add_user` mong đợi
    class FakeUserClass:
        username = DummyField("username")
        password = DummyField("password")
        query = DummyQuery(user)

        def __init__(self, name, username, password, email=None, avatar=None):
            self.name = name
            self.username = username
            self.password = password
            self.email = email
            self.avatar = avatar

    monkeypatch.setattr(utils, "User", FakeUserClass)

    found = utils.check_login("me", raw_password)
    assert found is user

    # kiểm tra `add_user` có gọi `db.session.add`/`commit` và hash mật khẩu
    captured = {}

    class DummyDBSession:
        def __init__(self):
            self.added = None

        def add(self, obj):
            captured["obj"] = obj

        def commit(self):
            captured["committed"] = True

    m = MagicMock()
    m.session = DummyDBSession()
    monkeypatch.setattr(utils, "db", m)
    utils.add_user(name="X", username="u1", password="p1", email="e")
    assert "obj" in captured
    assert hasattr(captured["obj"], "password")
    assert captured["committed"] is True


def test_add_comment_updates_shop_rating(monkeypatch):
    # Chuẩn bị luồng tạo comment
    created = {}

    class DummyDBSession:
        def __init__(self):
            pass

        def add(self, obj):
            created["comment"] = obj

        def commit(self):
            created["committed"] = True

        def query(self, *args, **kwargs):
            class Q:
                def filter(self_inner, *a, **k):
                    class S:
                        def scalar(self):
                            return 4.2

                    return S()

            return Q()

    monkeypatch.setattr(utils, "db", types.SimpleNamespace(session=DummyDBSession()))

    shop = DummyShop(99)
    m = MagicMock()
    m.query.get = MagicMock(return_value=shop)
    monkeypatch.setattr(utils, "Shop", m)

    c = utils.add_comment("hello", shop_id=99, user_id=1, rating=4, images=["a.png"])
    assert created.get("committed") is True
    assert shop.rating == round(4.2, 1)
    assert c is not None


def test_load_shops_pagination_and_radius(monkeypatch):
    # Tạo các shop với khoảng cách để kiểm thử phân trang/vùng
    s1 = DummyShop(1, lat=0.0, lon=0.0)
    s2 = DummyShop(2, lat=0.1, lon=0.1)
    m = MagicMock()
    m.query.all.return_value = [s1, s2]
    m.query.count.return_value = 2
    monkeypatch.setattr(utils, "Shop", m)

    # đặt `PAGE_SIZE` nhỏ để kiểm thử phân trang
    monkeypatch.setitem(utils.app.config, "PAGE_SIZE", 1)

    shops_page, total = utils.load_shops(
        page=1, user_lat=0.0, user_lon=0.0, radius=20000
    )
    assert total == 2
    assert len(shops_page) == 1


def test_search_helpers(monkeypatch):
    # kiểm tra `get_all_cities`
    class C:
        def __init__(self, name):
            self.name = name

    m = MagicMock()
    m.name = DummyField("name")
    m.query.order_by.return_value.all.return_value = [C("A"), C("B")]
    monkeypatch.setattr(utils, "City", m)
    assert utils.get_all_cities() == ["A", "B"]

    # categories
    class Cat:
        def __init__(self, name):
            self.name = name

    m = MagicMock()
    m.name = DummyField("name")
    m.query.order_by.return_value.all.return_value = [Cat("X")]
    monkeypatch.setattr(utils, "Category", m)
    assert utils.get_all_categories() == ["X"]

    # search_shops_by_items
    m = MagicMock()
    m.items.contains.return_value = True
    m.query.filter.return_value.all.return_value = [DummyShop(7)]
    monkeypatch.setattr(utils, "Shop", m)
    assert len(utils.search_shops_by_items(["X"])) == 1


def test_get_all_shops_context_and_comments_and_shop_by_id(monkeypatch):
    shop = DummyShop(3)
    shop.items = "Banh"
    shop.address = "addr"
    shop.price = "50"
    shop.city_obj = types.SimpleNamespace(name="HCM")

    m = MagicMock()
    m.query.all.return_value = [shop]
    m.query.get.return_value = shop
    monkeypatch.setattr(utils, "Shop", m)
    # Comment needs shop_id and created_date.desc()
    cm = MagicMock()
    cm.shop_id = DummyField("shop_id")
    cm.created_date.desc.return_value = None
    cm.query.filter.return_value.order_by.return_value.all.return_value = []
    monkeypatch.setattr(utils, "Comment", cm)

    ctx = utils.get_all_shops_context()
    assert "DANH SÁCH" in ctx
    assert utils.get_shop_by_id(3) is shop
    assert isinstance(utils.get_comments(3), list)
