from flask import Blueprint, request, jsonify, current_app, url_for
from flask_login import current_user
from werkzeug.utils import secure_filename
import os
from datetime import datetime

from sqlalchemy import text

from . import db
from .models import Shop, User, ChallengeRecord
from .utils import calculate_distance, load_shops

challenge_bp = Blueprint('challenge', __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads', 'challenge_receipts')
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _load_tiktok_videos_from_db(limit=100):
    """Try to load TikTok video links from known tables.

    Strategy:
      1. Try a table named `tiktok_video` with columns `video_url`, `shop_id`, `lat`, `lon`.
      2. Otherwise, check `shop` table for a column named `tiktok_link` or `video_url`.
      3. Return a list of dicts: {id, url, shop_id, lat, lon}
    """
    videos = []
    try:
        # Try the common custom table first
        sql = text("SELECT id, video_url, shop_id, lat, lon FROM tiktok_video LIMIT :lim")
        res = db.session.execute(sql, {'lim': limit})
        rows = list(res)
        for r in rows:
            videos.append({'id': r['id'], 'url': r['video_url'], 'shop_id': r.get('shop_id'), 'lat': r.get('lat'), 'lon': r.get('lon')})
        if videos:
            return videos
    except Exception:
        # Table might not exist — ignore and try next strategy
        current_app.logger.debug('No tiktok_video table or query failed; trying shop columns')

    # Inspect Shop columns for tiktok/video fields
    try:
        shop_cols = Shop.__table__.columns.keys()
        colname = None
        for candidate in ('tiktok_link', 'video_url', 'tiktok_url'):
            if candidate in shop_cols:
                colname = candidate
                break

        if colname:
            q = Shop.query.filter(getattr(Shop, colname).isnot(None)).limit(limit).all()
            for s in q:
                videos.append({'id': f'shop-{s.id}', 'url': getattr(s, colname), 'shop_id': s.id, 'lat': s.lat, 'lon': s.lon})
            return videos
    except Exception:
        current_app.logger.debug('Inspecting Shop for video columns failed', exc_info=True)

    return videos


def start_challenge():
    """Start a challenge. If `tiktok_links` is not provided, load from DB.

    Payload (JSON): {
      optional: tiktok_links: [urls...]
      optional: lat, lon, radius_km
    }

    Response: { videos: [...], nearby_shops: [...], points_per_location: 10 }
    """
    data = request.get_json() or {}
    links = data.get('tiktok_links')
    user_lat = data.get('lat')
    user_lon = data.get('lon')
    radius_km = data.get('radius_km', 5)

    videos = []

    # If client didn't provide links, try to load from DB
    if not links:
        db_videos = _load_tiktok_videos_from_db(limit=100)
        # Convert DB records to the same shape
        for v in db_videos:
            url = v.get('url')
            if not url:
                continue
            vid = url.rstrip('/').split('/')[-1]
            embed = f"https://www.tiktok.com/embed/{vid}"
            videos.append({'original': url, 'id': vid, 'embed': embed, 'shop_id': v.get('shop_id'), 'shop_lat': v.get('lat'), 'shop_lon': v.get('lon')})
    else:
        # Normalize provided links
        for l in links:
            vid = l.rstrip('/').split('/')[-1]
            embed = f"https://www.tiktok.com/embed/{vid}"
            videos.append({'original': l, 'id': vid, 'embed': embed})

    # If user provided location, find nearby shops via existing helper
    shops = []
    if user_lat and user_lon:
        try:
            nearby, total = load_shops(user_lat=user_lat, user_lon=user_lon, radius=radius_km)
            shops = [s.to_dict() for s in nearby]
        except Exception:
            current_app.logger.exception('load_shops failed')

    return jsonify({'videos': videos, 'nearby_shops': shops, 'points_per_location': 10})


def complete_challenge():
    """Complete a challenge by uploading a receipt and providing coordinates.

    Form-data expected:
      - shop_id
      - user_lat, user_lon
      - receipt (file) [optional]
    """
    user = None
    shop_id = request.form.get('shop_id')
    try:
        user_lat = float(request.form.get('user_lat')) if request.form.get('user_lat') else None
        user_lon = float(request.form.get('user_lon')) if request.form.get('user_lon') else None
    except Exception:
        return jsonify({'success': False, 'error': 'Invalid coordinates'}), 400

    if not shop_id:
        return jsonify({'success': False, 'error': 'shop_id is required'}), 400

    shop = Shop.query.get(shop_id)
    if not shop:
        return jsonify({'success': False, 'error': 'Shop not found'}), 404

    # calculate distance (km)
    dist_km = calculate_distance(user_lat, user_lon, shop.lat, shop.lon)
    MAX_DIST_KM = 0.2  # 200m
    if dist_km is None or dist_km > MAX_DIST_KM:
        return jsonify({'success': False, 'error': 'Bạn chưa ở vị trí yêu cầu', 'distance_km': dist_km}), 400

    dest_name = None
    dest_path = None
    if 'receipt' in request.files and request.files['receipt'].filename:
        f = request.files['receipt']
        filename = secure_filename(f.filename)
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        dest_name = f"{user.id}_{timestamp}_{filename}"
        dest_path = os.path.join(UPLOAD_DIR, dest_name)
        f.save(dest_path)

    # OCR hook (optional)
    ocr_text = ""
    # if dest_path:
    #     from .ocr_module import perform_ocr
    #     ocr_text = perform_ocr(dest_path)

    POINTS_PER_LOCATION = 10
    # Determine acting user: prefer logged-in user, otherwise accept user_id or a test user
    def _get_user_for_request():
        # 1) logged-in
        try:
            if current_user and getattr(current_user, 'is_authenticated', False):
                return User.query.get(current_user.id)
        except Exception:
            pass

        # 2) user_id provided in form/json/args
        uid = None
        if request.method == 'POST':
            uid = request.form.get('user_id') or (request.get_json() or {}).get('user_id')
        else:
            uid = request.args.get('user_id')
        if uid:
            try:
                return User.query.get(int(uid))
            except Exception:
                pass

        # 3) fallback: create/find a local test user
        test = User.query.filter_by(username='__test_user__').first()
        if not test:
            test = User(name='Test User', username='__test_user__', password='test')
            db.session.add(test)
            db.session.commit()
        return test

    try:
        u = _get_user_for_request()
        if u is None:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        u.points = (u.points or 0) + POINTS_PER_LOCATION

        rec = ChallengeRecord(
            user_id=u.id,
            shop_id=shop.id,
            points=POINTS_PER_LOCATION,
            receipt_url=(url_for('static', filename=f'uploads/challenge_receipts/{dest_name}', _external=False) if dest_name else None),
            ocr_text=ocr_text,
        )

        db.session.add(rec)
        db.session.commit()

        vouchers_available = []
        if u.points >= 30:
            vouchers_available.append({'code': 'VOUCHER30', 'discount': '30%', 'description': 'Đổi 30 điểm lấy voucher giảm giá'})

        return jsonify({'success': True, 'new_points': u.points, 'vouchers': vouchers_available})
    except Exception as ex:
        db.session.rollback()
        current_app.logger.exception('Lỗi khi hoàn thành challenge')
        return jsonify({'success': False, 'error': str(ex)}), 500


@challenge_bp.route('/vouchers', methods=['GET'])
def get_vouchers():
    """Return voucher suggestions based on user points."""
    # Allow unauthenticated testing: accept `user_id` param or use test user
    if current_user and getattr(current_user, 'is_authenticated', False):
        u = User.query.get(current_user.id)
    else:
        uid = request.args.get('user_id')
        if uid:
            u = User.query.get(uid)
        else:
            u = User.query.filter_by(username='__test_user__').first()
    if not u:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    points = u.points or 0
    suggestions = []
    if points >= 30:
        suggestions.append({'code': 'VOUCHER30', 'discount': '30%', 'description': 'Đổi 30 điểm lấy voucher'})
    if points >= 60:
        suggestions.append({'code': 'VOUCHER60', 'discount': '50%', 'description': 'Đổi 60 điểm lấy voucher lớn'})

    return jsonify({'success': True, 'points': points, 'suggestions': suggestions})
from flask import Blueprint, request, jsonify, current_app, url_for
from flask_login import current_user, login_required
from werkzeug.utils import secure_filename
import os
from datetime import datetime

from . import db
from .models import Shop, User, ChallengeRecord
from .utils import calculate_distance, load_shops

challenge_bp = Blueprint('challenge', __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads', 'challenge_receipts')
os.makedirs(UPLOAD_DIR, exist_ok=True)


@challenge_bp.route('/start', methods=['POST'])
@login_required
def start_challenge():
    """
    Bắt đầu một thử thách. Payload (json): {
       tiktok_links: ["https://www.tiktok.com/..", ...],
       lat: float, lon: float, radius_km: float
    }
    Trả về: payload thử thách bao gồm thông tin video và cửa hàng gần đó
    """
    data = request.get_json() or {}
    links = data.get('tiktok_links', [])
    user_lat = data.get('lat')
    user_lon = data.get('lon')
    radius_km = data.get('radius_km', 5)

    # Chuẩn hoá đơn giản: với mỗi link TikTok, trả về đường dẫn embed và id
    videos = []
    for l in links:
        # phân tích đơn giản: lấy đoạn cuối của path làm id
        vid = l.rstrip('/').split('/')[-1]
        embed = f"https://www.tiktok.com/embed/{vid}"
        videos.append({'original': l, 'id': vid, 'embed': embed})

    # Tìm cửa hàng gần đó (nếu có tọa độ) — tái sử dụng logic load_shops
    shops = []
    if user_lat and user_lon:
        nearby, total = load_shops(user_lat=user_lat, user_lon=user_lon, radius=radius_km)
        shops = [s.to_dict() for s in nearby]

    return jsonify({'videos': videos, 'nearby_shops': shops, 'points_per_location': 10})


@challenge_bp.route('/complete', methods=['POST'])
@login_required
def complete_challenge():
    """
    Hoàn thành thử thách bằng cách upload hoá đơn và cung cấp tọa độ hiện tại.
    Form-data kỳ vọng:
      - shop_id
      - user_lat, user_lon
      - receipt (file)

    Endpoint này sẽ:
      - xác thực khoảng cách giữa tọa độ người dùng và cửa hàng được giao
      - lưu file hoá đơn
      - (HOOK) gọi hàm OCR để trích văn bản từ hoá đơn (xem chú thích)
      - tạo bản ghi ChallengeRecord và cộng điểm cho người dùng
    """
    user = current_user
    shop_id = request.form.get('shop_id')
    try:
        user_lat = float(request.form.get('user_lat')) if request.form.get('user_lat') else None
        user_lon = float(request.form.get('user_lon')) if request.form.get('user_lon') else None
    except Exception:
        return jsonify({'success': False, 'error': 'Invalid coordinates'}), 400

    if not shop_id:
        return jsonify({'success': False, 'error': 'shop_id is required'}), 400

    shop = Shop.query.get(shop_id)
    if not shop:
        return jsonify({'success': False, 'error': 'Shop not found'}), 404

    # tính khoảng cách (km)
    dist_km = calculate_distance(user_lat, user_lon, shop.lat, shop.lon)
    MAX_DIST_KM = 0.2  # ngưỡng 200 mét — điều chỉnh nếu cần
    if dist_km > MAX_DIST_KM:
        return jsonify({'success': False, 'error': 'Bạn chưa ở vị trí yêu cầu', 'distance_km': dist_km}), 400

    # Lưu file hoá đơn upload lên server
    if 'receipt' not in request.files:
        return jsonify({'success': False, 'error': 'receipt file required'}), 400

    f = request.files['receipt']
    filename = secure_filename(f.filename)
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    dest_name = f"{user.id}_{timestamp}_{filename}"
    dest_path = os.path.join(UPLOAD_DIR, dest_name)
    f.save(dest_path)

    # --- HOOK OCR ---
    # Chỗ để gọi hàm OCR và trả về văn bản trích xuất từ hoá đơn.
    # Ví dụ (thay bằng gọi hàm thực tế):
    # from .ocr_module import perform_ocr
    # ocr_text = perform_ocr(dest_path)
    # Hiện tại để placeholder rỗng.
    ocr_text = ""  # TODO: gọi OCR tại đây và gán cho `ocr_text`

    # Award points and create record
    POINTS_PER_LOCATION = 10
    try:
        # Refresh user object from DB
        u = User.query.get(user.id)
        if u is None:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        u.points = (u.points or 0) + POINTS_PER_LOCATION

        rec = ChallengeRecord(
            user_id=u.id,
            shop_id=shop.id,
            points=POINTS_PER_LOCATION,
            receipt_url=url_for('static', filename=f'uploads/challenge_receipts/{dest_name}', _external=False),
            ocr_text=ocr_text,
        )
        db.session.add(rec)
        db.session.commit()

        # Nếu người dùng đạt ngưỡng (30 điểm) gợi ý voucher
        vouchers_available = []
        if u.points >= 30:
            vouchers_available.append({'code': 'VOUCHER30', 'discount': '30%', 'description': 'Đổi 30 điểm lấy voucher giảm giá'})

        return jsonify({'success': True, 'new_points': u.points, 'vouchers': vouchers_available})
    except Exception as ex:
        db.session.rollback()
        current_app.logger.exception('Lỗi khi hoàn thành challenge')
        return jsonify({'success': False, 'error': str(ex)}), 500


@challenge_bp.route('/vouchers', methods=['GET'])
@login_required
def get_vouchers():
    """Trả về gợi ý voucher dựa trên điểm của người dùng."""
    u = User.query.get(current_user.id)
    if not u:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    points = u.points or 0
    suggestions = []
    if points >= 30:
        suggestions.append({'code': 'VOUCHER30', 'discount': '30%', 'description': 'Đổi 30 điểm lấy voucher'})
    if points >= 60:
        suggestions.append({'code': 'VOUCHER60', 'discount': '50%', 'description': 'Đổi 60 điểm lấy voucher lớn'})

    return jsonify({'success': True, 'points': points, 'suggestions': suggestions})
from flask import Blueprint, request, jsonify, current_app, url_for
from flask_login import current_user, login_required
from werkzeug.utils import secure_filename
import os
from datetime import datetime

from . import db
from .models import Shop, User, ChallengeRecord
from .utils import calculate_distance, get_shop_by_id, get_user_by_id, search_shops_by_items, load_shops

challenge_bp = Blueprint('challenge', __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads', 'challenge_receipts')
os.makedirs(UPLOAD_DIR, exist_ok=True)


@challenge_bp.route('/start', methods=['POST'])
@login_required
def start_challenge():
    """
    Bắt đầu một thử thách. Payload (json): {
       tiktok_links: ["https://www.tiktok.com/..", ...],
       lat: float, lon: float, radius_km: float
    }
    Trả về: payload thử thách bao gồm thông tin video và cửa hàng gần đó
    """
    data = request.get_json() or {}
    links = data.get('tiktok_links', [])
    user_lat = data.get('lat')
    user_lon = data.get('lon')
    radius_km = data.get('radius_km', 5)

    # Chuẩn hoá đơn giản: với mỗi link TikTok, trả về đường dẫn embed và id
    videos = []
    for l in links:
        # phân tích đơn giản: lấy đoạn cuối của path làm id
        vid = l.rstrip('/').split('/')[-1]
        embed = f"https://www.tiktok.com/embed/{vid}"
        videos.append({ 'original': l, 'id': vid, 'embed': embed })

    # Tìm cửa hàng gần đó (nếu có tọa độ) — tái sử dụng logic load_shops
    shops = []
    if user_lat and user_lon:
        nearby, total = load_shops(user_lat=user_lat, user_lon=user_lon, radius=radius_km)
        shops = [s.to_dict() for s in nearby]

    return jsonify({ 'videos': videos, 'nearby_shops': shops, 'points_per_location': 10 })

