import os
import sys
import json
from types import SimpleNamespace
from unittest.mock import MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import utils

from index import app
import challenge


def make_video(id=1, shop=None, desc="d"):
    v = SimpleNamespace(id=id, embed_url=f"url-{id}", description=desc, shop=shop)
    return v


class DummyShop:
    def __init__(self, id=1, lat=0.0, lon=0.0, name=None):
        self.id = id
        self.shop_name = f"Shop {id}"
        self.address = f"Addr {id}"
        self.lat = lat
        self.lon = lon
        if name:
            self.name = name


def test_get_videos_no_coords(monkeypatch):
    # Chuẩn bị hai video kèm shop
    s1 = DummyShop(1)
    s2 = DummyShop(2)
    v1 = make_video(1, shop=s1)
    v2 = make_video(2, shop=s2)

    q = MagicMock()
    q.join.return_value = q
    q.all.return_value = [v1, v2]
    monkeypatch.setattr(challenge, "TikTokVideo", SimpleNamespace(query=q))

    client = app.test_client()
    resp = client.post("/api/challenge/videos", json={})
    assert resp.status_code == 200
    body = resp.get_json()
    assert len(body["videos"]) == 2
    assert body["videos"][0]["shop"]["distance_km"] == "N/A"


def test_get_videos_with_coords_and_radius(monkeypatch):
    # hai shop, một nằm trong bán kính
    s1 = DummyShop(1, lat=0, lon=0)
    s2 = DummyShop(2, lat=100, lon=0)
    v1 = make_video(1, shop=s1)
    v2 = make_video(2, shop=s2)

    q = MagicMock()
    q.join.return_value = q
    q.all.return_value = [v1, v2]
    monkeypatch.setattr(challenge, "TikTokVideo", SimpleNamespace(query=q))

    # làm cho `calculate_distance` trả 1.0 cho v1 và 10.0 cho v2
    def fake_calc(lat1, lon1, lat2, lon2):
        return 1.0 if lat2 == s1.lat else 10.0

    monkeypatch.setattr(challenge, "calculate_distance", fake_calc)

    client = app.test_client()
    # dùng lat/lon khác 0 để các điều kiện truthy thỏa
    resp = client.post("/api/challenge/videos", json={"lat": 1, "lon": 1, "radius": 5})
    assert resp.status_code == 200
    body = resp.get_json()
    # only one video within radius
    assert len(body["videos"]) == 1


def _login_as(client, monkeypatch, user_id=5):
    # mô phỏng user đã đăng nhập
    monkeypatch.setattr(
        challenge,
        "current_user",
        MagicMock(
            id=user_id,
            is_active=True,
            is_authenticated=True,
            get_id=lambda: str(user_id),
        ),
    )
    # đảm bảo user_loader không gọi DB thật
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
        sess["_user_id"] = str(user_id)


def test_add_and_remove_shop(monkeypatch):
    client = app.test_client()
    _login_as(client, monkeypatch, user_id=7)

    # giả lập `get_or_create_session` trả session có danh sách rỗng
    session_obj = SimpleNamespace(
        user_id=7, target_shops=json.dumps([]), status="ACTIVE"
    )
    monkeypatch.setattr(challenge, "get_or_create_session", lambda uid: session_obj)
    monkeypatch.setattr(
        challenge,
        "db",
        SimpleNamespace(
            session=SimpleNamespace(
                add=lambda x: None, commit=lambda: None, delete=lambda x: None
            )
        ),
    )

    resp = client.post("/api/challenge/add", json={"shop_id": 11})
    assert resp.status_code == 200
    assert resp.get_json().get("success")

    # thêm trùng sẽ trả lỗi
    session_obj.target_shops = json.dumps([11])
    resp = client.post("/api/challenge/add", json={"shop_id": 11})
    assert resp.status_code == 400

    # vượt giới hạn
    session_obj.target_shops = json.dumps([1, 2, 3])
    resp = client.post("/api/challenge/add", json={"shop_id": 99})
    assert resp.status_code == 400

    # xóa: đặt session active cho `current_user`
    session_obj.target_shops = json.dumps([11])
    # Giả lập query cho `ChallengeSession.filter_by(...).first()`
    q = MagicMock()
    q.filter_by.return_value = SimpleNamespace(first=lambda: session_obj)
    monkeypatch.setattr(challenge, "ChallengeSession", SimpleNamespace(query=q))

    resp = client.post("/api/challenge/remove", json={"shop_id": 11})
    assert resp.status_code == 200


def test_get_my_challenges_and_checkin(monkeypatch):
    client = app.test_client()
    _login_as(client, monkeypatch, user_id=9)

    # chuẩn bị session có 1 shop id
    session_obj = SimpleNamespace(
        user_id=9, target_shops=json.dumps([5]), status="ACTIVE"
    )
    q = MagicMock()
    q.filter_by.return_value = SimpleNamespace(first=lambda: session_obj)
    monkeypatch.setattr(challenge, "ChallengeSession", SimpleNamespace(query=q))

    # `Shop.get` trả về shop có khoảng cách 0.1
    shop = DummyShop(5, lat=0.0, lon=0.0)
    monkeypatch.setattr(
        challenge, "Shop", SimpleNamespace(query=SimpleNamespace(get=lambda sid: shop))
    )
    monkeypatch.setattr(challenge, "calculate_distance", lambda a, b, c, d: 0.1)

    resp = client.get("/api/challenge/current")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["has_session"]
    assert body["count"] == 1

    # checkin success: make User.query.get return user with points
    user_obj = SimpleNamespace(id=9, points=0)
    monkeypatch.setattr(
        challenge,
        "User",
        SimpleNamespace(query=SimpleNamespace(get=lambda uid: user_obj)),
    )
    # gửi form data POST cho checkin
    resp = client.post(
        "/api/challenge/checkin", data={"user_lat": "0", "user_lon": "0"}
    )
    assert resp.status_code == 200
    assert resp.get_json().get("points") == 15


def test_redeem_voucher_and_my_vouchers(monkeypatch):
    client = app.test_client()
    _login_as(client, monkeypatch, user_id=10)

    # thiết lập user và voucher
    user = SimpleNamespace(id=10, points=100)
    voucher = SimpleNamespace(
        id=2, point_cost=30, code="X", description="d", image_url="http://img"
    )
    monkeypatch.setattr(
        challenge, "User", SimpleNamespace(query=SimpleNamespace(get=lambda uid: user))
    )
    monkeypatch.setattr(
        challenge,
        "Voucher",
        SimpleNamespace(
            query=SimpleNamespace(
                get=lambda vid: voucher if vid == 2 else None, all=lambda: [voucher]
            )
        ),
    )

    # làm `UserVoucher` giống lớp có thể khởi tạo và có `query`
    class FakeUserVoucher:
        query = SimpleNamespace(
            filter_by=lambda **kw: SimpleNamespace(
                order_by=lambda x: SimpleNamespace(all=lambda: [])
            )
        )

        def __init__(self, user_id, voucher_id):
            self.user_id = user_id
            self.voucher_id = voucher_id

    monkeypatch.setattr(challenge, "UserVoucher", FakeUserVoucher)
    monkeypatch.setattr(
        challenge,
        "db",
        SimpleNamespace(
            session=SimpleNamespace(
                add=lambda x: None, commit=lambda: None, rollback=lambda: None
            )
        ),
    )

    resp = client.post("/api/challenge/redeem", json={"voucher_id": 2})
    assert resp.status_code == 200
    assert resp.get_json().get("success")

    # không đủ điểm
    user.points = 0
    resp = client.post("/api/challenge/redeem", json={"voucher_id": 2})
    assert resp.status_code == 400

    # `get_my_owned_vouchers`: tạo một `UserVoucher` có `voucher`
    import datetime

    uv = SimpleNamespace(
        id=7, status="UNUSED", created_date=datetime.datetime.now(), voucher=voucher
    )

    class FakeUV:
        created_date = SimpleNamespace(desc=lambda: "created_desc")
        query = SimpleNamespace(
            filter_by=lambda **kw: SimpleNamespace(
                order_by=lambda x: SimpleNamespace(all=lambda: [uv])
            )
        )

    monkeypatch.setattr(challenge, "UserVoucher", FakeUV)

    resp = client.get("/api/challenge/my-vouchers")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["count"] == 1
