import os
import sys
import json

# Đảm bảo đường dẫn package `backend` có thể được import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest

from index import app
import io
import types
from unittest.mock import MagicMock
import utils


class DummyShop:
    def __init__(self, id=1):
        self.id = id
        self.shop_name = f"Shop {id}"

    def to_dict(self):
        return {"id": self.id, "name": self.shop_name}


class DummyComment:
    def __init__(self, content="ok"):
        self.content = content

    def to_dict(self):
        return {"content": self.content}


def test_api_get_shops(monkeypatch):
    # Thiết lập: giả lập (monkeypatch) các hàm trong `utils` được endpoint sử dụng
    dummy_shops = [DummyShop(1), DummyShop(2)]

    def fake_load_shops(**kwargs):
        return dummy_shops, 2

    monkeypatch.setattr("utils.load_shops", fake_load_shops)
    monkeypatch.setattr("utils.get_all_categories", lambda: ["A", "B"])
    monkeypatch.setattr("utils.get_all_cities", lambda: ["X", "Y"])

    # Thực thi
    client = app.test_client()
    resp = client.get("/api/shops?keyword=test")

    # Kiểm tra
    assert resp.status_code == 200
    data = resp.get_json()
    assert "data" in data
    assert data["pagination"]["total_count"] == 2
    assert data["filters"]["cities"] == ["X", "Y"]


def test_api_shop_detail_not_found(monkeypatch):
    monkeypatch.setattr("utils.get_shop_by_id", lambda shop_id: None)

    client = app.test_client()
    resp = client.get("/api/shops/999")
    assert resp.status_code == 404
    assert resp.get_json().get("error")


def test_api_shop_detail_found(monkeypatch):
    shop = DummyShop(5)
    comments = [DummyComment("nice")]
    monkeypatch.setattr("utils.get_shop_by_id", lambda shop_id: shop)
    monkeypatch.setattr("utils.get_comments", lambda shop_id: comments)

    client = app.test_client()
    resp = client.get("/api/shops/5")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["shop"]["id"] == 5
    assert isinstance(body["comments"], list)


def test_api_chat_no_message():
    client = app.test_client()
    resp = client.post(
        "/api/chat", data=json.dumps({"message": ""}), content_type="application/json"
    )
    assert resp.status_code == 400


def test_api_search_by_image_no_file():
    client = app.test_client()
    resp = client.post("/api/search-by-image")
    assert resp.status_code == 400


def test_api_register_success(monkeypatch):
    recorded = {}

    def fake_add_user(**kwargs):
        recorded.update(kwargs)

    monkeypatch.setattr(utils, "add_user", fake_add_user)

    client = app.test_client()
    data = {
        "name": "A",
        "username": "u1",
        "pass": "p1",
        "confirm": "p1",
        "email": "e@x",
    }
    resp = client.post("/api/register", data=data)
    assert resp.status_code == 201
    assert recorded.get("username") == "u1"


def test_api_register_password_mismatch():
    client = app.test_client()
    data = {"username": "u2", "pass": "a", "confirm": "b"}
    resp = client.post("/api/register", data=data)
    assert resp.status_code == 400


def test_api_login_success(monkeypatch):
    class U:
        def __init__(self):
            self.id = 1
            self.is_active = True

        def to_dict(self):
            return {"id": 1}

        def get_id(self):
            return str(self.id)

    user = U()
    monkeypatch.setattr(utils, "check_login", lambda username, password: user)

    client = app.test_client()
    resp = client.post("/api/login", json={"username": "x", "password": "y"})
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["success"] is True


def test_api_login_failure(monkeypatch):
    monkeypatch.setattr(utils, "check_login", lambda username, password: None)
    client = app.test_client()
    resp = client.post("/api/login", json={"username": "x", "password": "y"})
    assert resp.status_code == 401


def test_api_logout_and_current_user(monkeypatch):
    # logout luôn trả về thành công
    client = app.test_client()
    resp = client.post("/api/logout")
    assert resp.status_code == 200

    # trường hợp user chưa xác thực
    monkeypatch.setattr("index.current_user", MagicMock(is_authenticated=False))
    resp = client.get("/api/current-user")
    assert resp.status_code == 200
    assert resp.get_json()["is_authenticated"] is False

    # trường hợp đã xác thực
    monkeypatch.setattr(
        "index.current_user",
        MagicMock(is_authenticated=True, to_dict=lambda: {"id": 2}),
    )
    resp = client.get("/api/current-user")
    assert resp.get_json()["is_authenticated"] is True


def test_api_forgot_verify_reset_flow(monkeypatch):
    user = MagicMock(id=9)
    monkeypatch.setattr(utils, "get_user_by_email", lambda email: user)
    monkeypatch.setattr(utils, "generate_and_send_reset_code", lambda uid: True)

    client = app.test_client()
    resp = client.post("/api/forgot-password", json={"email": "x@x"})
    assert resp.status_code == 200

    # xác minh mã
    monkeypatch.setattr(utils, "verify_reset_code", lambda uid, code: True)
    resp = client.post("/api/verify-code", json={"user_id": 9, "reset_code": "1"})
    assert resp.status_code == 200

    # đổi mật khẩu thành công
    monkeypatch.setattr(utils, "verify_reset_code", lambda uid, code: True)
    monkeypatch.setattr(utils, "update_password", lambda uid, np: True)
    resp = client.post(
        "/api/reset-password",
        json={"user_id": 9, "reset_code": "1", "new_password": "p"},
    )
    assert resp.status_code == 200

    # xác minh mã thất bại khi đổi mật khẩu
    monkeypatch.setattr(utils, "verify_reset_code", lambda uid, code: False)
    resp = client.post(
        "/api/reset-password",
        json={"user_id": 9, "reset_code": "bad", "new_password": "p"},
    )
    assert resp.status_code == 400


def test_api_update_avatar_no_file_and_success(monkeypatch):
    client = app.test_client()

    # không có file - mô phỏng user đã đăng nhập bằng cách set session và user loader
    monkeypatch.setattr(
        utils,
        "get_user_by_id",
        lambda user_id: MagicMock(
            id=int(user_id),
            is_active=True,
            is_authenticated=True,
            get_id=lambda: str(user_id),
        ),
    )
    with client.session_transaction() as sess:
        sess["_user_id"] = "1"
    resp = client.post("/api/update-avatar")
    assert resp.status_code == 400

    # đường thành công: giả lập `cloudinary.uploader` trên `index.cloudinary`
    monkeypatch.setattr(
        "index.cloudinary",
        MagicMock(uploader=MagicMock(upload=lambda f: {"secure_url": "http://img"})),
    )
    monkeypatch.setattr(utils, "update_user_avatar", lambda uid, url: True)

    data = {"avatar": (io.BytesIO(b"imgdata"), "a.jpg")}
    resp = client.post(
        "/api/update-avatar", data=data, content_type="multipart/form-data"
    )
    assert resp.status_code == 200
    assert resp.get_json().get("avatar_url") == "http://img"


def test_api_add_comment_file_limits_and_success(monkeypatch):
    client = app.test_client()
    # mô phỏng user đã đăng nhập
    monkeypatch.setattr(
        utils,
        "get_user_by_id",
        lambda user_id: MagicMock(
            id=int(user_id),
            is_active=True,
            is_authenticated=True,
            get_id=lambda: str(user_id),
        ),
    )
    with client.session_transaction() as sess:
        sess["_user_id"] = "2"

    # quá nhiều file (4) - gửi dưới dạng list of tuples để Flask thu thập nhiều field
    files = {"images": [(io.BytesIO(b"a"), f"a{i}.jpg") for i in range(4)]}
    resp = client.post(
        "/api/shops/1/comments", data=files, content_type="multipart/form-data"
    )
    assert resp.status_code == 400

    # trường hợp thành công với 1 file
    # đảm bảo `cloudinary.uploader.upload` có sẵn trên `index.cloudinary`
    monkeypatch.setattr(
        "index.cloudinary",
        MagicMock(uploader=MagicMock(upload=lambda f: {"secure_url": "http://img"})),
    )
    monkeypatch.setattr(
        utils,
        "add_comment",
        lambda content, shop_id, user_id, rating, images: types.SimpleNamespace(
            to_dict=lambda: {"id": 1}
        ),
    )

    data = {"content": "nice", "rating": "4", "images": (io.BytesIO(b"b"), "b.jpg")}
    resp = client.post(
        "/api/shops/1/comments", data=data, content_type="multipart/form-data"
    )
    assert resp.status_code == 200


def test_api_chat_success_returns_shops(monkeypatch):
    # giả lập phản hồi AI
    monkeypatch.setattr(
        utils,
        "get_gemini_response",
        lambda msg, chat_history=[]: {"answer": "hi", "shop_ids": [7]},
    )
    monkeypatch.setattr(
        utils, "get_shop_by_id", lambda sid: MagicMock(to_dict=lambda: {"id": sid})
    )

    client = app.test_client()
    resp = client.post("/api/chat", json={"message": "hello", "history": []})
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["shops"][0]["id"] == 7
