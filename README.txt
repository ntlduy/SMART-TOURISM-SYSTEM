# Hướng Dẫn Sử Dụng Souvenir AI Chat

## Tổng Quan
Đây là ứng dụng chat AI chuyên về tư vấn đồ lưu niệm và mua sắm, sử dụng backend FastAPI (Python) và frontend HTML đơn giản.

## Yêu Cầu Hệ Thống
- Python 3.8+ (khuyến nghị 3.10+)
- Windows (hoặc tương thích với PowerShell)

## Cài Đặt

### 1. Tải Dự Án
- Sao chép toàn bộ thư mục `d:\project2` vào máy của bạn.
- Đảm bảo các file sau có mặt:
  - `backend.py`
  - `index.html`
  - `requirements.txt`
  - `google_api_key.txt` (chứa API key OpenRouter)

### 2. Cài Đặt Dependencies
Mở PowerShell hoặc Command Prompt, điều hướng đến thư mục dự án:

```
cd d:\project2
```

Cài đặt các thư viện Python cần thiết:

```
pip install -r requirements.txt
```

Lệnh này sẽ cài đặt:
- fastapi
- uvicorn
- google-generativeai
- openai==0.28.1

### 3. Chuẩn Bị API Key
- File `google_api_key.txt` đã chứa API key OpenRouter của bạn.
- Nếu cần thay đổi, chỉnh sửa file này với key mới (bắt đầu bằng `sk-or-v1-...`).

## Chạy Ứng Dụng

### Bước 1: Khởi Động Backend
Trong PowerShell, chạy:

```
python backend.py
```

Hoặc sử dụng uvicorn trực tiếp:

```
uvicorn backend:app --reload --host 0.0.0.0 --port 8000
```

Bạn sẽ thấy thông báo: "Server đang chạy tại: http://localhost:8000"

### Bước 2: Mở Frontend
- Mở trình duyệt web (Chrome, Firefox, Edge, v.v.)
- Điều hướng đến: `http://localhost:8000`
- Trang HTML sẽ tải và hiển thị chat box ở góc trái màn hình.

## Sử Dụng

### Chat với AI
- Nhấn vào nút 💬 để mở chat box.
- Nhập câu hỏi về đồ lưu niệm, chợ, mua sắm (ví dụ: "Mua quà gì ở Hà Nội?").
- AI sẽ trả lời bằng tiếng Việt hoặc tiếng Anh dựa trên ngôn ngữ của bạn.
- Gợi ý: Sử dụng các chip gợi ý sẵn có.

### Kiểm Tra Trạng Thái
- Truy cập `http://localhost:8000/_debug` để xem trạng thái API key và AI mode.

## Xử Lý Sự Cố

### Lỗi "Xin lỗi, hệ thống đang bận"
- Kiểm tra file `backend_error.log` để xem chi tiết lỗi.
- Đảm bảo API key hợp lệ và có đủ credits trên OpenRouter.

### Server Không Khởi Động
- Đảm bảo port 8000 không bị chiếm (kiểm tra bằng `netstat -ano | findstr :8000`).
- Cài lại dependencies nếu cần.

### Frontend Không Tải
- Đảm bảo backend đang chạy.
- Kiểm tra firewall hoặc antivirus chặn port 8000.

## Logs và Debug
- `backend_startup.log`: Thông tin khởi động.
- `backend_error.log`: Lỗi chi tiết.
- `ai_responses.log`: Phản hồi từ AI.

## Tùy Chỉnh
- Chỉnh sửa `backend.py` để thay đổi system instruction hoặc model AI.
- Sửa `index.html` để thay đổi giao diện frontend.

## Liên Hệ
Nếu gặp vấn đề, kiểm tra logs hoặc cung cấp chi tiết lỗi.

---

**Lưu ý**: Ứng dụng sử dụng OpenRouter API để truy cập các model AI như GPT-4o. Đảm bảo tuân thủ điều khoản sử dụng của OpenRouter.</content>
<parameter name="filePath">d:\project2\README.txt