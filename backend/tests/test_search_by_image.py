import ast
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from backend import search_by_image


def _setup_mocks(
    monkeypatch, response_text=None, requests_raises=False, genai_raises=False
):
    # Giả lập requests.get
    if requests_raises:

        def bad_get(url):
            raise RuntimeError("network error")

        monkeypatch.setattr(search_by_image, "requests", MagicMock(get=bad_get))
    else:
        fake_resp = SimpleNamespace(content=b"fake-image-bytes")
        monkeypatch.setattr(
            search_by_image, "requests", MagicMock(get=lambda url: fake_resp)
        )

    # Giả lập PIL Image.open để nhận BytesIO và trả về placeholder
    monkeypatch.setattr(search_by_image, "Image", MagicMock(open=lambda b: "IMG"))

    # Giả lập genai.GenerativeModel
    class FakeModel:
        def __init__(self, *args, **kwargs):
            pass

        def generate_content(self, args):
            if genai_raises:
                raise RuntimeError("genai failure")
            return SimpleNamespace(text=response_text)

    monkeypatch.setattr(search_by_image.genai, "GenerativeModel", FakeModel)


def test_success_list_parse(monkeypatch):
    resp = "['Chai nước', 'Bánh snack']"
    _setup_mocks(monkeypatch, response_text=resp)

    result = search_by_image.phan_tich_hinh_anh("http://example.com/image.jpg")
    assert isinstance(result, list)
    assert result == ["Chai nước", "Bánh snack"]


def test_code_fence_parse(monkeypatch):
    resp = "```json\n['Chai nước']\n```"
    _setup_mocks(monkeypatch, response_text=resp)

    result = search_by_image.phan_tich_hinh_anh("http://example.com/img")
    assert result == ["Chai nước"]


def test_fallback_slice_parse(monkeypatch):
    # Response contains surrounding text; initial ast.literal_eval on whole text will fail
    resp = "Some explanation... result: ['Gạo', 'Đường'] -- end"
    _setup_mocks(monkeypatch, response_text=resp)

    result = search_by_image.phan_tich_hinh_anh("http://example.com/img")
    assert result == ["Gạo", "Đường"]


def test_non_list_response_returns_empty(monkeypatch):
    resp = "'just a string'"
    _setup_mocks(monkeypatch, response_text=resp)

    result = search_by_image.phan_tich_hinh_anh("http://example.com/img")
    assert result == []


def test_genai_raises_returns_empty(monkeypatch):
    _setup_mocks(monkeypatch, response_text=None, genai_raises=True)

    result = search_by_image.phan_tich_hinh_anh("http://example.com/img")
    assert result == []


def test_requests_get_raises_returns_empty(monkeypatch):
    _setup_mocks(monkeypatch, requests_raises=True)

    result = search_by_image.phan_tich_hinh_anh("http://example.com/img")
    assert result == []
