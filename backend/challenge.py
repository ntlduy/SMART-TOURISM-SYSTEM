import json
import os
# from datetime import datetimes

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from werkzeug.utils import secure_filename

from __init__ import db
from models import  ChallengeSession, City, Shop, TikTokVideo, User
from utils import calculate_distance

from models import Voucher, UserVoucher, User # Cập nhật dòng import

challenge_bp = Blueprint("challenge", __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads", "challenge_receipts")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)


# --- API 1: Lấy danh sách Video theo GPS (Đã sửa đổi) ---
@challenge_bp.route("/videos", methods=["POST"]) # Đổi thành POST để gửi JSON toạ độ
def get_videos_by_location():
    """
    Input: { "lat": 10.762, "lon": 106.660 }
    Logic: Tìm quán gần nhất -> Suy ra Tỉnh -> Trả về Video của Tỉnh đó.
    """
    data = request.get_json()
    user_lat = data.get("lat")
    user_lon = data.get("lon")

    if not user_lat or not user_lon:
        return jsonify({"error": "Không lấy được vị trí GPS"}), 400

    # 1. Tìm quán gần nhất để xác định người dùng đang ở Tỉnh nào
    # (Vì bảng City không có toạ độ, nên ta dựa vào toạ độ của các Shop)
    all_shops = Shop.query.all()
    
    if not all_shops:
        return jsonify({"error": "Hệ thống chưa có dữ liệu cửa hàng nào."}), 404

    nearest_shop = None
    min_dist = float('inf') # Vô cực

    for shop in all_shops:
        # Tính khoảng cách
        dist = calculate_distance(user_lat, user_lon, shop.lat, shop.lon)
        if dist is not None and dist < min_dist:
            min_dist = dist
            nearest_shop = shop
    
    # Nếu khoảng cách quá xa (ví dụ > 50km), có thể báo lỗi (tùy chọn)
    # if min_dist > 50:
    #     return jsonify({"error": "Bạn đang ở quá xa khu vực hỗ trợ."}), 400

    if not nearest_shop:
         return jsonify({"error": "Không xác định được vị trí"}), 400

    # 2. Lấy thông tin Tỉnh từ quán gần nhất
    current_city = nearest_shop.city_obj # Sử dụng relationship backref từ models.py
    
    print(f"User đang ở gần quán '{nearest_shop.shop_name}' -> Thuộc tỉnh: {current_city.name}")

    # 3. Lấy video của Tỉnh đó
    videos = TikTokVideo.query.filter_by(city_id=current_city.id).all()
    
    if not videos:
        return jsonify({
            "city": current_city.name,
            "id": current_city.id,
            "videos": [],
            "message": f"Chào mừng đến {current_city.name}! Tuy nhiên chưa có video thử thách nào ở đây."
        })

    return jsonify({
        "city": current_city.name,
        "id": current_city.id,
        "videos": [{
            "id": v.id,
            "embed_url": v.embed_url, 
            "desc": v.description
        } for v in videos]
    })


# --- API 2: Tạo Thử thách 3 Cửa hàng (Bước 2) ---
@challenge_bp.route("/start", methods=["POST"])
@login_required
def start_challenge_route():
    """
    Khi user bấm vào 1 video -> Tạo lộ trình 3 quán gần nhất đến xa nhất.
    Input: { "lat": 10.7, "lon": 106.6, "city_id": 1 }
    """
    data = request.get_json()
    user_lat = data.get("lat")
    user_lon = data.get("lon")
    city_id = data.get("city_id")

    if not user_lat or not user_lon:
        return jsonify({"error": "Cần tọa độ GPS để tìm quán"}), 400

    from sqlalchemy import and_ # Nhớ import thêm and_ nếu chưa có, hoặc dùng cách dưới cho đơn giản
    
    # Cách viết đơn giản không cần import thêm:
    existing_session = ChallengeSession.query.filter(
        ChallengeSession.user_id == current_user.id,
        ChallengeSession.status != 'COMPLETED',
        ChallengeSession.status != 'CANCELLED'
    ).first()
    
    if existing_session:
        # In ra log để debug xem tại sao nó tồn tại
        print(f"--- TÌM THẤY SESSION CŨ: ID={existing_session.id}, STATUS={existing_session.status} ---")
        return jsonify({
            "error": "Bạn đang có một thử thách chưa hoàn thành.",
            "session_id": existing_session.id,
            "status": existing_session.status
        }), 400

    # 2. Lấy tất cả shop trong Tỉnh đó để tính khoảng cách
    shops = Shop.query.filter_by(city_id=city_id).all()
    if len(shops) < 3:
        return jsonify({"error": "Khu vực này chưa đủ 3 quán để tạo thử thách"}), 400

    # 3. Tính khoảng cách và sắp xếp từ Gần -> Xa
    shop_distances = []
    for s in shops:
        dist = calculate_distance(user_lat, user_lon, s.lat, s.lon)
        if dist is not None:
            shop_distances.append({"shop": s, "dist": dist})
    
    # Sắp xếp tăng dần theo khoảng cách
    shop_distances.sort(key=lambda x: x["dist"])

    # Chọn 3 quán gần nhất (hoặc logic khác tùy Đại Vương)
    selected_shops = shop_distances[:3]
    selected_shop_ids = [item["shop"].id for item in selected_shops]

    # 4. Lưu Session vào DB
    new_session = ChallengeSession(
        user_id=current_user.id,
        target_shops=json.dumps(selected_shop_ids), # Lưu [1, 5, 20]
        current_step=0, # Chưa đi quán nào
        status="ACTIVE"
    )
    db.session.add(new_session)
    db.session.commit()

    return jsonify({
        "message": "Đã tạo thử thách!",
        "session_id": new_session.id,
        "route": [{
            "step": idx + 1,
            "shop_name": item["shop"].shop_name,
            "address": item["shop"].address,
            "lat": item["shop"].lat,
            "lon": item["shop"].lon,
            "distance_km": round(item["dist"], 2)
        } for idx, item in enumerate(selected_shops)]
    })


# --- API 3: Check-in tại từng điểm (Bước 3) ---
@challenge_bp.route("/checkin", methods=["POST"])
@login_required
def checkin_step():
    """
    User đến quán -> Bấm xác nhận -> Hệ thống kiểm tra đúng thứ tự không.
    Input: { "user_lat": ..., "user_lon": ..., "shop_id": ... }
    """
    # 1. Lấy session đang active
    session = ChallengeSession.query.filter_by(
        user_id=current_user.id, status="ACTIVE"
    ).first()
    
    if not session:
        return jsonify({"error": "Bạn chưa bắt đầu thử thách nào"}), 400

    data = request.form # Dùng form vì có thể up ảnh
    current_lat = float(data.get("user_lat", 0))
    current_lon = float(data.get("user_lon", 0))
    
    # Parse danh sách shop cần đi
    target_ids = json.loads(session.target_shops) # [1, 5, 20]
    current_step_index = session.current_step # Ví dụ: 0 (đang cần đi shop đầu tiên là ID 1)

    # 2. Kiểm tra xem user có đang check-in đúng quán theo thứ tự không
    if current_step_index >= len(target_ids):
        return jsonify({"message": "Bạn đã hoàn thành hết rồi!"})

    expected_shop_id = target_ids[current_step_index]
    
    # Lấy thông tin shop mục tiêu
    target_shop = Shop.query.get(expected_shop_id)
    
    # 3. Kiểm tra khoảng cách GPS (Bán kính 200m)
    dist = calculate_distance(current_lat, current_lon, target_shop.lat, target_shop.lon)
    if dist > 0.2:
        return jsonify({
            "success": False, 
            "error": f"Bạn còn cách quán {round(dist*1000)}m nữa. Hãy đến gần hơn!"
        }), 400

    # 4. (Tùy chọn) Lưu ảnh bằng chứng nếu cần
    # ... (Code lưu ảnh giống bài trước) ...

    # 5. Cập nhật tiến độ
    session.current_step += 1
    
    # Tính điểm: Mỗi quán 10 điểm, Quán cuối thưởng thêm 20 điểm
    points_awarded = 10
    is_finished = False
    
    if session.current_step >= len(target_ids):
        session.status = "COMPLETED"
        points_awarded += 20 # Bonus hoàn thành lộ trình
        is_finished = True
    
    # Cộng điểm cho User
    user = User.query.get(current_user.id)
    user.points = (user.points or 0) + points_awarded
    
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Check-in thành công!",
        "points_earned": points_awarded,
        "next_step": session.current_step + 1 if not is_finished else None,
        "is_finished": is_finished
    })


# ---  API 4: Hủy và Xóa khỏi Database ---
@challenge_bp.route("/cancel", methods=["POST"])
@login_required
def cancel_challenge():
    session = ChallengeSession.query.filter_by(
        user_id=current_user.id, status="ACTIVE"
    ).first()
    
    if session:
        # THAY ĐỔI: Xóa hẳn dòng này khỏi Database thay vì chỉ đổi status
        db.session.delete(session)
        db.session.commit()
        return jsonify({"success": True, "message": "Đã xóa thử thách cũ. Bạn có thể bắt đầu mới."})
    
    return jsonify({"error": "Không tìm thấy thử thách để xóa"}), 400





# --- API 5: Lấy danh sách Voucher có thể đổi ---
@challenge_bp.route("/vouchers", methods=["GET"])
@login_required
def get_vouchers():
    """
    Trả về danh sách tất cả voucher đang có trong hệ thống
    """
    vouchers = Voucher.query.all()
    
    # Lấy thông tin điểm hiện tại của user để hiển thị (nếu đã login)
    user_points = 0
    if current_user.is_authenticated:
        # Reload user từ DB để đảm bảo điểm số mới nhất
        u = User.query.get(current_user.id)
        user_points = u.points if u.points else 0

    return jsonify({
        "user_points": user_points,
        "vouchers": [v.to_dict() for v in vouchers]
    })


# --- API 6: Thực hiện Đổi điểm (Redeem) ---
@challenge_bp.route("/redeem", methods=["POST"])
@login_required
def redeem_voucher():
    """
    Input: { "voucher_id": 1 }
    Logic: Trừ điểm User -> Tạo UserVoucher
    """
    data = request.get_json()
    voucher_id = data.get("voucher_id")
    
    if not voucher_id:
        return jsonify({"error": "Chưa chọn voucher"}), 400
        
    # 1. Lấy thông tin User và Voucher
    user = User.query.get(current_user.id) # Lấy user mới nhất từ DB
    voucher = Voucher.query.get(voucher_id)
    
    if not voucher:
        return jsonify({"error": "Voucher không tồn tại"}), 404
        
    # 2. Kiểm tra xem User có đủ điểm không
    current_points = user.points if user.points else 0
    
    if current_points < voucher.point_cost:
        return jsonify({
            "success": False,
            "error": f"Bạn không đủ điểm! (Có: {current_points}, Cần: {voucher.point_cost})"
        }), 400
        
    # 3. Thực hiện giao dịch (Trừ điểm + Thêm voucher)
    try:
        # Trừ điểm
        user.points = current_points - voucher.point_cost
        
        # Thêm vào kho của user
        user_voucher = UserVoucher(user_id=user.id, voucher_id=voucher.id)
        db.session.add(user_voucher)
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Đổi thành công voucher {voucher.code}!",
            "new_points": user.points
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Lỗi giao dịch: " + str(e)}), 500
    


# --- API MỚI: Lấy thông tin thử thách đang chạy (Resume) ---
@challenge_bp.route("/current", methods=["GET"])
@login_required
def get_current_challenge():
    """
    Input: GET /api/challenge/current?lat=10.7&lon=106.6
    Output: Trả về lộ trình kèm khoảng cách tính từ vị trí hiện tại.
    """
    # 1. Lấy toạ độ hiện tại của user gửi lên (nếu có)
    user_lat = request.args.get('lat')
    user_lon = request.args.get('lon')

    # Tìm session đang active
    session = ChallengeSession.query.filter(
        ChallengeSession.user_id == current_user.id,
        ChallengeSession.status == 'ACTIVE'
    ).first()
    
    if not session:
        return jsonify({"has_session": False}), 200

    # Tái tạo lộ trình
    try:
        target_ids = json.loads(session.target_shops)
        route_data = []
        
        for idx, shop_id in enumerate(target_ids):
            s = Shop.query.get(shop_id)
            if s:
                # --- TÍNH LẠI KHOẢNG CÁCH ---
                dist_km = 0
                if user_lat and user_lon:
                    try:
                        # Chuyển đổi sang float và tính toán
                        dist_km = calculate_distance(float(user_lat), float(user_lon), s.lat, s.lon)
                        dist_km = round(dist_km, 2) # Làm tròn 2 số lẻ
                    except ValueError:
                        dist_km = 0 # Nếu dữ liệu lỗi thì để 0

                route_data.append({
                    "step": idx + 1,
                    "shop_name": s.shop_name,
                    "address": s.address,
                    "lat": s.lat,
                    "lon": s.lon,
                    "distance_km": dist_km, # <--- Đã có khoảng cách mới nhất
                    "status": "DONE" if idx < session.current_step else "PENDING"
                })
        
        return jsonify({
            "has_session": True,
            "session_id": session.id,
            "current_step": session.current_step,
            "route": route_data
        })
    except Exception as e:
        print("Lỗi resume:", str(e))
        return jsonify({"error": "Lỗi dữ liệu session cũ"}), 500