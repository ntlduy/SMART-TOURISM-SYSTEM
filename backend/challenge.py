import json
import os
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from __init__ import db
from models import ChallengeSession, Shop, TikTokVideo, User, Voucher, UserVoucher
from utils import calculate_distance

challenge_bp = Blueprint("challenge", __name__)

# --- Helper: Lấy hoặc tạo Session ---
def get_or_create_session(user_id):
    session = ChallengeSession.query.filter_by(
        user_id=user_id, status="ACTIVE"
    ).first()
    
    if not session:
        # Tạo mới với danh sách rỗng
        session = ChallengeSession(
            user_id=user_id,
            target_shops=json.dumps([]), # List rỗng
            current_step=0,
            status="ACTIVE"
        )
        db.session.add(session)
        db.session.commit()
    return session

# --- API 1: Lấy danh sách Video (Có bộ lọc khoảng cách) ---
@challenge_bp.route("/videos", methods=["POST"])
def get_videos_with_filter():
    """
    Input: { "lat": ..., "lon": ..., "radius": 5 } (Radius là km, có thể null)
    Logic: Trả về video, nếu có lat/lon/radius thì lọc các shop nằm trong bán kính.
    """
    data = request.get_json() or {}
    user_lat = data.get("lat")
    user_lon = data.get("lon")
    radius = data.get("radius") # Bán kính (km), ví dụ: 5, 10, hoặc None (không lọc)

    query = TikTokVideo.query.join(Shop)
    videos = query.all()
    
    results = []
    
    for v in videos:
        shop = v.shop
        dist = None
        
        # Tính khoảng cách nếu có GPS
        if user_lat and user_lon:
            try:
                dist = calculate_distance(float(user_lat), float(user_lon), shop.lat, shop.lon)
            except:
                dist = None
        
        # Logic lọc: Nếu có radius và dist > radius thì BỎ QUA
        if radius and dist is not None:
            if dist > float(radius):
                continue 

        results.append({
            "video_id": v.id,
            "embed_url": v.embed_url,
            "desc": v.description,
            "shop": {
                "id": shop.id,
                "name": shop.shop_name,
                "address": shop.address,
                "distance_km": round(dist, 2) if dist is not None else "N/A"
            }
        })
        
    # Sắp xếp: Gần nhất lên đầu (nếu có khoảng cách)
    if user_lat and user_lon:
        results.sort(key=lambda x: x['shop']['distance_km'] if isinstance(x['shop']['distance_km'], float) else 9999)

    return jsonify({"videos": results})


# --- API 2: Thêm Shop vào Thử thách (Bấm vào Video) ---
@challenge_bp.route("/add", methods=["POST"])
@login_required
def add_shop_to_challenge():
    """
    Input: { "shop_id": 1 }
    Logic: Thêm shop vào list. Max 3 shop. Không trùng.
    """
    data = request.get_json()
    shop_id = data.get("shop_id")
    
    if not shop_id:
        return jsonify({"error": "Thiếu Shop ID"}), 400

    session = get_or_create_session(current_user.id)
    current_list = json.loads(session.target_shops) # VD: [1, 5]

    # 1. Kiểm tra giới hạn 3
    if len(current_list) >= 3:
        return jsonify({"error": "Bạn chỉ được nhận tối đa 3 thử thách cùng lúc!"}), 400
    
    # 2. Kiểm tra trùng
    if shop_id in current_list:
        return jsonify({"error": "Bạn đã thêm quán này rồi!"}), 400
        
    # 3. Thêm vào DB
    current_list.append(shop_id)
    session.target_shops = json.dumps(current_list)
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "message": "Đã thêm thử thách!", 
        "current_count": len(current_list)
    })


# --- API 3: Xóa Shop khỏi Thử thách (Nếu khó quá bỏ qua) ---
@challenge_bp.route("/remove", methods=["POST"])
@login_required
def remove_shop_from_challenge():
    """
    Input: { "shop_id": 1 }
    Logic: Xóa ID khỏi list target_shops.
    """
    data = request.get_json()
    shop_id = data.get("shop_id")
    
    session = ChallengeSession.query.filter_by(user_id=current_user.id, status="ACTIVE").first()
    if not session:
        return jsonify({"error": "Không có thử thách nào"}), 400
        
    current_list = json.loads(session.target_shops)
    
    if shop_id in current_list:
        current_list.remove(shop_id)
        session.target_shops = json.dumps(current_list)
        
        # Nếu xóa hết thì có thể xóa luôn session hoặc giữ list rỗng tuỳ ý
        if not current_list:
            db.session.delete(session) # Xóa session luôn cho sạch
        
        db.session.commit()
        return jsonify({"success": True, "message": "Đã xóa thử thách này."})
    
    return jsonify({"error": "Thử thách này không có trong danh sách của bạn"}), 400


# --- API 4: Xem danh sách thử thách hiện tại (My List) ---
@challenge_bp.route("/current", methods=["GET"])
@login_required
def get_my_challenges():
    """
    Hiện danh sách các quán user đã chọn.
    Input: ?lat=...&lon=... (để tính khoảng cách cập nhật)
    """
    user_lat = request.args.get('lat')
    user_lon = request.args.get('lon')
    
    session = ChallengeSession.query.filter_by(user_id=current_user.id, status="ACTIVE").first()
    if not session:
        return jsonify({"has_session": False, "shops": []})
        
    target_ids = json.loads(session.target_shops)
    shops_data = []
    
    for sid in target_ids:
        s = Shop.query.get(sid)
        if s:
            dist = 0
            if user_lat and user_lon:
                try:
                    dist = calculate_distance(float(user_lat), float(user_lon), s.lat, s.lon)
                except: pass
            
            shops_data.append({
                "shop_id": s.id,
                "name": s.shop_name,
                "address": s.address,
                # "image": s.image, # Nếu có cột ảnh
                "distance_km": round(dist, 2),
                "lat": s.lat, 
                "lon": s.lon
            })
            
    return jsonify({
        "has_session": True,
        "count": len(shops_data),
        "shops": shops_data
    })


# --- API 5: Check-in (Hoàn thành 1 thử thách) ---
@challenge_bp.route("/checkin", methods=["POST"])
@login_required
def checkin_any_shop():
    """
    Logic: 
    1. Duyệt qua list target.
    2. Nếu dist < 0.5km -> Check-in thành công (break luôn).
    3. Nếu không, lưu lại khoảng cách nhỏ nhất (min_dist) để báo user biết họ còn cách bao xa.
    """
    data = request.form
    try:
        user_lat = float(data.get("user_lat", 0))
        user_lon = float(data.get("user_lon", 0))
    except ValueError:
        return jsonify({"error": "Tọa độ không hợp lệ"}), 400
    
    session = ChallengeSession.query.filter_by(user_id=current_user.id, status="ACTIVE").first()
    if not session:
        return jsonify({"error": "Bạn chưa nhận thử thách nào."}), 400
        
    target_ids = json.loads(session.target_shops) 
    
    matched_shop = None
    
    # Biến để theo dõi quán gần nhất nếu check-in thất bại
    min_distance = float('inf') 
    nearest_shop_name = ""

    for sid in target_ids:
        s = Shop.query.get(sid)
        if s:
            dist = calculate_distance(user_lat, user_lon, s.lat, s.lon)
            
            # CASE 1: Đủ gần -> Lấy luôn shop này
            if dist < 0.5: # 500m
                matched_shop = s
                break 
            
            # CASE 2: Chưa đủ gần -> Cập nhật quán "tiềm năng" gần nhất để báo cáo
            if dist < min_distance:
                min_distance = dist
                nearest_shop_name = s.name if hasattr(s, 'name') else s.shop_name

    # --- XỬ LÝ KẾT QUẢ ---
    if matched_shop:
        # XỬ LÝ THÀNH CÔNG
        user = User.query.get(current_user.id)
        user.points = (user.points or 0) + 15
        
        target_ids.remove(matched_shop.id)
        session.target_shops = json.dumps(target_ids)
        
        shop_display_name = matched_shop.name if hasattr(matched_shop, 'name') else matched_shop.shop_name
        msg = f"Check-in thành công tại {shop_display_name}! +15 điểm."
        
        if not target_ids:
            msg += " Chúc mừng! Bạn đã hoàn thành sạch sành sanh các thử thách!"
            session.status = "COMPLETED"
            
        db.session.commit()
        return jsonify({"success": True, "message": msg, "points": 15})
    
    else:
        # XỬ LÝ THẤT BẠI NHƯNG CÓ THÔNG TIN KHOẢNG CÁCH
        if min_distance != float('inf'):
            # Làm tròn khoảng cách cho đẹp (ví dụ 1.25 km)
            dist_display = round(min_distance, 2)
            return jsonify({
                "error": f"Chưa tới nơi đâu! Bạn còn cách quán gần nhất ({nearest_shop_name}) khoảng {dist_display} km nữa.",
                "distance": dist_display,
                "nearest_shop": nearest_shop_name
            }), 400
        else:
            return jsonify({"error": "Không tìm thấy dữ liệu quán trong thử thách!"}), 400@challenge_bp.route("/checkin", methods=["POST"])
@login_required
def checkin_any_shop():
    """
    Logic: 
    1. Duyệt qua list target.
    2. Nếu dist < 0.5km -> Check-in thành công (break luôn).
    3. Nếu không, lưu lại khoảng cách nhỏ nhất (min_dist) để báo user biết họ còn cách bao xa.
    """
    data = request.form
    try:
        user_lat = float(data.get("user_lat", 0))
        user_lon = float(data.get("user_lon", 0))
    except ValueError:
        return jsonify({"error": "Tọa độ không hợp lệ"}), 400
    
    session = ChallengeSession.query.filter_by(user_id=current_user.id, status="ACTIVE").first()
    if not session:
        return jsonify({"error": "Bạn chưa nhận thử thách nào."}), 400
        
    target_ids = json.loads(session.target_shops) 
    
    matched_shop = None
    
    # Biến để theo dõi quán gần nhất nếu check-in thất bại
    min_distance = float('inf') 
    nearest_shop_name = ""

    for sid in target_ids:
        s = Shop.query.get(sid)
        if s:
            dist = calculate_distance(user_lat, user_lon, s.lat, s.lon)
            
            # CASE 1: Đủ gần -> Lấy luôn shop này
            if dist < 0.5: # 500m
                matched_shop = s
                break 
            
            # CASE 2: Chưa đủ gần -> Cập nhật quán "tiềm năng" gần nhất để báo cáo
            if dist < min_distance:
                min_distance = dist
                nearest_shop_name = s.name if hasattr(s, 'name') else s.shop_name

    # --- XỬ LÝ KẾT QUẢ ---
    if matched_shop:
        # XỬ LÝ THÀNH CÔNG
        user = User.query.get(current_user.id)
        user.points = (user.points or 0) + 15
        
        target_ids.remove(matched_shop.id)
        session.target_shops = json.dumps(target_ids)
        
        shop_display_name = matched_shop.name if hasattr(matched_shop, 'name') else matched_shop.shop_name
        msg = f"Check-in thành công tại {shop_display_name}! +15 điểm."
        
        if not target_ids:
            msg += " Chúc mừng! Bạn đã hoàn thành sạch sành sanh các thử thách!"
            session.status = "COMPLETED"
            
        db.session.commit()
        return jsonify({"success": True, "message": msg, "points": 15})
    
    else:
        # XỬ LÝ THẤT BẠI NHƯNG CÓ THÔNG TIN KHOẢNG CÁCH
        if min_distance != float('inf'):
            # Làm tròn khoảng cách cho đẹp (ví dụ 1.25 km)
            dist_display = round(min_distance, 2)
            return jsonify({
                "error": f"Chưa tới nơi đâu! Bạn còn cách quán gần nhất ({nearest_shop_name}) khoảng {dist_display} km nữa.",
                "distance": dist_display,
                "nearest_shop": nearest_shop_name
            }), 400
        else:
            return jsonify({"error": "Không tìm thấy dữ liệu quán trong thử thách!"}), 400

# --- Các API Voucher giữ nguyên ---
@challenge_bp.route("/vouchers", methods=["GET"])
@login_required
def get_vouchers():
    vouchers = Voucher.query.all()
    user_points = 0
    if current_user.is_authenticated:
        u = User.query.get(current_user.id)
        user_points = u.points if u.points else 0

    return jsonify({
        "user_points": user_points,
        "vouchers": [v.to_dict() for v in vouchers]
    })

@challenge_bp.route("/redeem", methods=["POST"])
@login_required
def redeem_voucher():
    data = request.get_json()
    voucher_id = data.get("voucher_id")
    
    if not voucher_id:
        return jsonify({"error": "Chưa chọn voucher"}), 400
        
    user = User.query.get(current_user.id)
    voucher = Voucher.query.get(voucher_id)
    
    if not voucher:
        return jsonify({"error": "Voucher không tồn tại"}), 404
        
    current_points = user.points if user.points else 0
    
    if current_points < voucher.point_cost:
        return jsonify({
            "success": False,
            "error": f"Bạn thiếu điểm! (Có: {current_points}, Cần: {voucher.point_cost})"
        }), 400
        
    try:
        user.points = current_points - voucher.point_cost
        user_voucher = UserVoucher(user_id=user.id, voucher_id=voucher.id)
        db.session.add(user_voucher)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Đổi thành công {voucher.code}!",
            "new_points": user.points
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    


    # --- API 6: Xem Voucher của tôi (My Wallet) ---
@challenge_bp.route("/my-vouchers", methods=["GET"])
@login_required
def get_my_owned_vouchers():
    """
    Trả về danh sách voucher mà user hiện tại đang sở hữu.
    Bao gồm cả voucher chưa dùng (UNUSED) và đã dùng (USED).
    """
    # Query bảng UserVoucher, lọc theo user_id hiện tại, sắp xếp mới nhất lên đầu
    my_vouchers = UserVoucher.query.filter_by(user_id=current_user.id)\
                                   .order_by(UserVoucher.created_date.desc())\
                                   .all()
    
    results = []
    for uv in my_vouchers:
        # uv là đối tượng UserVoucher
        # uv.voucher là đối tượng Voucher (nhờ relationship trong models.py)
        if uv.voucher:
            results.append({
                "transaction_id": uv.id,           # ID của lần đổi (dùng để xử lý khi user bấm "Sử dụng")
                "status": uv.status,               # 'UNUSED' hoặc 'USED'
                "redeemed_date": uv.created_date.strftime("%d/%m/%Y %H:%M"),
                # Lấy thông tin chi tiết của Voucher gốc
                "voucher_info": {
                    "code": uv.voucher.code,
                    "description": uv.voucher.description,
                    "image_url": uv.voucher.image_url,
                    "point_cost": uv.voucher.point_cost
                }
            })

    return jsonify({
        "success": True,
        "count": len(results),
        "data": results
    })