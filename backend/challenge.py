import os
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request, url_for
from flask_login import current_user, login_required
from sqlalchemy import text
from werkzeug.utils import secure_filename

# --- SỬA LỖI IMPORT (QUAN TRỌNG) ---
# Dùng import tuyệt đối thay vì tương đối (.) để tránh lỗi ImportError
from __init__ import db
from models import ChallengeRecord, Shop, User
from utils import calculate_distance, load_shops

challenge_bp = Blueprint("challenge", __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads", "challenge_receipts")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _load_tiktok_videos_from_db(limit=100):
    """
    Hàm hỗ trợ: Tải link video TikTok từ database nếu có.
    """
    videos = []
    try:
        # 1. Thử tìm trong bảng riêng (nếu bạn có tạo bảng tiktok_video)
        sql = text("SELECT id, video_url, shop_id, lat, lon FROM tiktok_video LIMIT :lim")
        res = db.session.execute(sql, {"lim": limit})
        for r in res:
            videos.append({
                "id": r[0], # Truy cập bằng index nếu r là tuple/row
                "url": r[1],
                "shop_id": r[2],
                "lat": r[3],
                "lon": r[4],
            })
        if videos:
            return videos
    except Exception:
        pass

    # 2. Nếu không có bảng riêng, tìm trong bảng Shop xem có cột tiktok_link không
    try:
        shop_cols = Shop.__table__.columns.keys()
        colname = next((c for c in ("tiktok_link", "video_url", "tiktok_url") if c in shop_cols), None)

        if colname:
            # Lấy các shop có video
            q = Shop.query.filter(getattr(Shop, colname).isnot(None)).limit(limit).all()
            for s in q:
                url = getattr(s, colname)
                if url:
                    videos.append({
                        "id": f"shop-{s.id}",
                        "url": url,
                        "shop_id": s.id,
                        "lat": s.lat,
                        "lon": s.lon,
                    })
    except Exception:
        pass

    return videos


@challenge_bp.route("/start", methods=["POST"])
# @login_required  <-- Có thể bật hoặc tắt tùy việc bạn muốn khách vãng lai xem được không
def start_challenge():
    """
    Bắt đầu thử thách.
    Trả về danh sách video TikTok và các Shop gần đó.
    """
    data = request.get_json() or {}
    links = data.get("tiktok_links")
    user_lat = data.get("lat")
    user_lon = data.get("lon")
    radius_km = data.get("radius_km", 10)

    videos = []

    # 1. Xử lý Video: Nếu client không gửi link, tự tìm trong DB
    if not links:
        db_videos = _load_tiktok_videos_from_db(limit=20)
        for v in db_videos:
            url = v.get("url")
            if not url: continue
            # Lấy ID video từ URL (logic đơn giản)
            vid_id = url.rstrip("/").split("/")[-1]
            embed = f"https://www.tiktok.com/embed/{vid_id}"
            
            videos.append({
                "original": url,
                "id": vid_id,
                "embed": embed,
                "shop_id": v.get("shop_id"),
                "shop_lat": v.get("lat"),
                "shop_lon": v.get("lon"),
            })
    else:
        # Nếu client gửi danh sách link (hardcode từ frontend)
        for l in links:
            vid_id = l.rstrip("/").split("/")[-1]
            embed = f"https://www.tiktok.com/embed/{vid_id}"
            videos.append({"original": l, "id": vid_id, "embed": embed})

    # 2. Tìm Shop gần user (nếu có toạ độ)
    shops = []
    if user_lat and user_lon:
        try:
            nearby, _ = load_shops(user_lat=user_lat, user_lon=user_lon, radius=radius_km)
            shops = [s.to_dict() for s in nearby]
        except Exception as e:
            current_app.logger.error(f"Error loading shops: {e}")

    return jsonify({
        "videos": videos, 
        "nearby_shops": shops, 
        "points_per_location": 10
    })


@challenge_bp.route("/complete", methods=["POST"])
@login_required # Bắt buộc đăng nhập để tích điểm
def complete_challenge():
    """
    Hoàn thành thử thách: Upload hoá đơn + Check toạ độ -> Cộng điểm.
    """
    user = current_user
    shop_id = request.form.get("shop_id")
    
    # 1. Validate toạ độ
    try:
        user_lat = float(request.form.get("user_lat", 0))
        user_lon = float(request.form.get("user_lon", 0))
    except ValueError:
        return jsonify({"success": False, "error": "Toạ độ không hợp lệ"}), 400

    if not shop_id:
        return jsonify({"success": False, "error": "Thiếu Shop ID"}), 400

    shop = Shop.query.get(shop_id)
    if not shop:
        return jsonify({"success": False, "error": "Không tìm thấy cửa hàng"}), 404

    # 2. Tính khoảng cách (Check-in)
    dist_km = calculate_distance(user_lat, user_lon, shop.lat, shop.lon)
    MAX_DIST_KM = 0.5  # Cho phép sai số 500m (để dễ test)
    
    if dist_km is None or dist_km > MAX_DIST_KM:
        return jsonify({
            "success": False, 
            "error": "Bạn đang ở quá xa cửa hàng này!",
            "distance_km": dist_km
        }), 400

    # 3. Lưu ảnh hoá đơn
    dest_name = None
    if "receipt" in request.files:
        f = request.files["receipt"]
        if f.filename:
            filename = secure_filename(f.filename)
            timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
            dest_name = f"{user.id}_{timestamp}_{filename}"
            f.save(os.path.join(UPLOAD_DIR, dest_name))

    # 4. Cộng điểm và Lưu Record
    POINTS_REWARD = 10
    try:
        # Lấy lại user từ DB để đảm bảo session sync
        u_db = User.query.get(user.id)
        u_db.points = (u_db.points or 0) + POINTS_REWARD

        # Tạo record
        receipt_link = url_for('static', filename=f'uploads/challenge_receipts/{dest_name}') if dest_name else None
        
        rec = ChallengeRecord(
            user_id=u_db.id,
            shop_id=shop.id,
            points=POINTS_REWARD,
            receipt_url=receipt_link,
            ocr_text="" # Placeholder cho tính năng OCR sau này
        )
        
        db.session.add(rec)
        db.session.commit()

        return jsonify({
            "success": True, 
            "new_points": u_db.points,
            "message": f"Check-in thành công! Bạn nhận được {POINTS_REWARD} điểm."
        })

    except Exception as ex:
        db.session.rollback()
        current_app.logger.exception("Challenge Error")
        return jsonify({"success": False, "error": "Lỗi server khi lưu điểm"}), 500


@challenge_bp.route("/vouchers", methods=["GET"])
@login_required
def get_vouchers():
    """Lấy danh sách voucher đổi được."""
    u = User.query.get(current_user.id)
    points = u.points or 0
    
    suggestions = []
    # Logic giả lập voucher
    if points >= 30:
        suggestions.append({"code": "GIAM30K", "discount": "30.000đ", "description": "Cho đơn từ 100k"})
    if points >= 50:
        suggestions.append({"code": "FREE_SHIP", "discount": "Freeship", "description": "Miễn phí vận chuyển"})
    if points >= 100:
        suggestions.append({"code": "GIAM50%", "discount": "50%", "description": "Giảm tối đa 200k"})

    return jsonify({
        "success": True, 
        "points": points, 
        "suggestions": suggestions
    })