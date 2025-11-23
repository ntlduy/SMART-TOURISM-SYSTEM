import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import google.generativeai as genai
import openai
import os
import traceback
from datetime import datetime

# --- CẤU HÌNH ---
# API key loading: prefer environment variable `GOOGLE_API_KEY`.
# For convenience you may also place the key in a file named
# `google_api_key.txt` (in the project root). If neither is set,
# the placeholder value remains and the app runs in mock/test mode.
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
if not GOOGLE_API_KEY:
    # Try a helper file (optional, convenient for local testing)
    key_file = os.path.join(os.path.dirname(__file__), "google_api_key.txt")
    if os.path.exists(key_file):
        try:
            with open(key_file, "r", encoding="utf-8") as f:
                GOOGLE_API_KEY = f.read().strip()
        except Exception:
            GOOGLE_API_KEY = ""

if not GOOGLE_API_KEY:
    # Fallback placeholder (keeps existing mock behavior)
    GOOGLE_API_KEY = "DIEN_API_KEY_CUA_BAN_VAO_DAY"

app = FastAPI()

# Log startup info for debugging
if GOOGLE_API_KEY != "DIEN_API_KEY_CUA_BAN_VAO_DAY":
    try:
        with open("backend_startup.log", "a", encoding="utf-8") as fh:
            fh.write(f"AI mode enabled. Using provided API key.\n")
    except Exception:
        pass

# Cấu hình CORS để Frontend (HTML) có thể gọi vào Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the frontend index at the root so visiting http://localhost:8000 shows the UI
app.mount("/static", StaticFiles(directory="."), name="static")

@app.get("/", include_in_schema=False)
async def serve_index():
    return FileResponse("index.html")


@app.get("/_debug", include_in_schema=False)
async def debug_status():
    # Do not return the API key itself. Return booleans and a small hint for quick diagnostics.
    if GOOGLE_API_KEY == "DIEN_API_KEY_CUA_BAN_VAO_DAY":
        key_type = "missing"
    elif isinstance(GOOGLE_API_KEY, str) and GOOGLE_API_KEY.startswith("sk-or-"):
        key_type = "openrouter"
    elif isinstance(GOOGLE_API_KEY, str) and GOOGLE_API_KEY.startswith("sk-"):
        key_type = "openai"
    else:
        key_type = "google"

    return {
        "api_key_present": GOOGLE_API_KEY != "DIEN_API_KEY_CUA_BAN_VAO_DAY",
        "key_type_hint": key_type,
        "ai_mode": AI_MODE,
        "ai_ready": AI_READY,
        "ai_error_reason_brief": AI_ERROR_REASON if AI_ERROR_REASON else "",
    }

# Cấu hình AI (Gemini / OpenAI fallback)
# AI readiness flags and brief error for clients (detailed traceback goes to log)
AI_READY = False
AI_ERROR_REASON = ""
AI_MODE = None  # 'google' or 'openai'

# Shared system instruction used for both providers
SYSTEM_INSTRUCTION = """
Bạn là một trợ lý AI chuyên gia về Đồ Lưu Niệm (Souvenir) và Chợ (Market).

QUY TẮC TUYỆT ĐỐI:
1. CHỈ trả lời các câu hỏi về: quà tặng, đồ thủ công, đặc sản, các khu chợ, giá cả mua sắm, văn hóa mặc cả.
2. NẾU câu hỏi KHÔNG LIÊN QUAN (ví dụ: code, toán, chính trị, thời sự...): Hãy lịch sự từ chối. Ví dụ: "Xin lỗi, tôi chỉ hỗ trợ tư vấn về đồ lưu niệm và mua sắm thôi ạ."
3. NGÔN NGỮ: Tự động phát hiện và trả lời cùng ngôn ngữ với người dùng (Tiếng Việt hoặc Tiếng Anh).
4. GỢI Ý: Nếu có thể, hãy gợi ý thêm địa điểm mua cụ thể.
"""

if GOOGLE_API_KEY != "DIEN_API_KEY_CUA_BAN_VAO_DAY":
    try:
        # If key looks like OpenRouter ('sk-or-...'), initialize OpenAI client with OpenRouter base URL
        if isinstance(GOOGLE_API_KEY, str) and GOOGLE_API_KEY.startswith("sk-or-"):
            # Configure openai lib for OpenRouter usage
            openai.api_key = GOOGLE_API_KEY
            openai.api_base = "https://openrouter.ai/api/v1"
            # Optional headers for OpenRouter rankings
            openai.default_headers = {
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Souvenir AI Chat"
            }
            AI_MODE = "openrouter"
            AI_READY = True
        elif isinstance(GOOGLE_API_KEY, str) and GOOGLE_API_KEY.startswith("sk-"):
            # Fallback for direct OpenAI key
            openai.api_key = GOOGLE_API_KEY
            AI_MODE = "openai"
            AI_READY = True
        else:
            # Assume Google key for Gemini
            genai.configure(api_key=GOOGLE_API_KEY)
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=SYSTEM_INSTRUCTION,
            )
            AI_MODE = "google"
            AI_READY = True
    except Exception as e:
        # Store a short reason for client-friendly messages and write full traceback to log
        AI_ERROR_REASON = str(e)
        try:
            with open("backend_error.log", "a", encoding="utf-8") as fh:
                fh.write(f"--- {datetime.utcnow().isoformat()} UTC (init) ---\n")
                fh.write(traceback.format_exc())
                fh.write("\n\n")
        except Exception:
            pass

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    user_msg = request.message
    
    # Chế độ giả lập (nếu chưa điền API Key)
    if GOOGLE_API_KEY == "DIEN_API_KEY_CUA_BAN_VAO_DAY":
        # Giả lập logic từ chối để test
        if "code" in user_msg.lower() or "python" in user_msg.lower():
            return {"reply": "Xin lỗi, tôi chỉ hỗ trợ tư vấn về đồ lưu niệm (Chế độ Test)."}
        return {"reply": f"Đây là câu trả lời mẫu cho: '{user_msg}'. Hãy điền API Key vào backend để AI hoạt động thật sự!"}

    # Nếu cấu hình API key có vấn đề (ví dụ: key dạng OpenAI hoặc khởi tạo model lỗi), trả lời mô tả rõ ràng hơn
    if not AI_READY:
        if "OpenAI-style" in AI_ERROR_REASON or "sk-" in AI_ERROR_REASON:
            return {"reply": "Xin lỗi, API key hiện tại có vẻ là khóa OpenAI hoặc OpenRouter (bắt đầu bằng 'sk-'). Vui lòng kiểm tra key và thử lại."}
        return {"reply": "Xin lỗi, hệ thống AI chưa sẵn sàng. Vui lòng kiểm tra cấu hình API key trên server (xem backend_error.log để biết chi tiết)."}

    # Chế độ AI thật: tách biệt cho Google Gemini vs OpenAI
    if AI_MODE == "google":
        try:
            chat_session = model.start_chat(history=[])
            response = chat_session.send_message(user_msg)
            # Log the AI response for debugging (include repr and text)
            try:
                with open("ai_responses.log", "a", encoding="utf-8") as fh:
                    fh.write("REPR:\n")
                    try:
                        fh.write(repr(response) + "\n")
                    except Exception:
                        fh.write("<could not repr response>\n")
                    fh.write("TEXT:\n")
                    try:
                        fh.write(response.text + "\n")
                    except Exception:
                        fh.write("<no response.text>\n")
                    fh.write("---\n")
            except Exception:
                pass
            return {"reply": response.text}
        except Exception:
            try:
                with open("backend_error.log", "a", encoding="utf-8") as fh:
                    fh.write(f"--- {datetime.utcnow().isoformat()} UTC ---\n")
                    fh.write(traceback.format_exc())
                    fh.write("\n\n")
            except Exception:
                pass
            return {"reply": "Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau."}

    if AI_MODE == "openai":
        try:
            # Use older OpenAI client API (openai==0.28.x)
            resp = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": SYSTEM_INSTRUCTION},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0.7,
                max_tokens=800,
            )
            text = ""
            try:
                text = resp.choices[0].message.get("content", "") if hasattr(resp.choices[0], 'message') else (resp.choices[0].text or "")
            except Exception:
                try:
                    text = resp.choices[0].text
                except Exception:
                    text = ""

            # Log response
            try:
                with open("ai_responses.log", "a", encoding="utf-8") as fh:
                    fh.write("OPENAI RESPONSE:\n")
                    fh.write(str(resp) + "\n---\n")
            except Exception:
                pass

            return {"reply": text.strip()}
        except Exception:
            try:
                with open("backend_error.log", "a", encoding="utf-8") as fh:
                    fh.write(f"--- {datetime.utcnow().isoformat()} UTC (openai) ---\n")
                    fh.write(traceback.format_exc())
                    fh.write("\n\n")
            except Exception:
                pass
            return {"reply": "Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau."}

    if AI_MODE == "openrouter":
        try:
            # Use OpenAI client configured for OpenRouter
            resp = openai.ChatCompletion.create(
                model="openai/gpt-4o",  # Use GPT-4o via OpenRouter for better responses
                messages=[
                    {"role": "system", "content": SYSTEM_INSTRUCTION},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0.7,
                max_tokens=800,
            )
            text = ""
            try:
                text = resp.choices[0].message.get("content", "") if hasattr(resp.choices[0], 'message') else (resp.choices[0].text or "")
            except Exception:
                try:
                    text = resp.choices[0].text
                except Exception:
                    text = ""

            # Log response
            try:
                with open("ai_responses.log", "a", encoding="utf-8") as fh:
                    fh.write("OPENROUTER RESPONSE:\n")
                    fh.write(str(resp) + "\n---\n")
            except Exception:
                pass

            return {"reply": text.strip()}
        except Exception:
            try:
                with open("backend_error.log", "a", encoding="utf-8") as fh:
                    fh.write(f"--- {datetime.utcnow().isoformat()} UTC (openrouter) ---\n")
                    fh.write(traceback.format_exc())
                    fh.write("\n\n")
            except Exception:
                pass
            return {"reply": "Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau."}

    # If AI_MODE is unknown for some reason
    return {"reply": "Xin lỗi, hệ thống AI chưa được cấu hình đúng. Vui lòng kiểm tra server."}

if __name__ == "__main__":
    print("Server đang chạy tại: http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)