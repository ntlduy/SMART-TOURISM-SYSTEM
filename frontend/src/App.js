import React, { useState, useEffect, useRef } from 'react';
import {
    Search, MapPin, Star, ShoppingBag,
    Camera, MessageCircle, X, Send, LogOut,
    ChevronRight, CheckCircle, Gift,
    Trophy, Video, UploadCloud, Navigation, User as UserIcon, Mail, Lock
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import L from 'leaflet';
import 'leaflet-routing-machine';

const DEFAULT_IMAGE = '/assets/stores/default.png';
// --- CẤU HÌNH API ---
const API_BASE = 'http://localhost:5000';

// --- TIỆN ÍCH ---
const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};
// --- FIX LỖI ICON MARKER TRONG REACT LEAFLET ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
// --- COMPONENT NÚT VỀ VỊ TRÍ HIỆN TẠI ---
const RecenterControl = ({ lat, lon }) => {
    const map = useMap();

    const handleRecenter = (e) => {
        e.stopPropagation();
        if (lat && lon) {
            map.flyTo([lat, lon], 16, { duration: 1.5 });
        }
    };

    return (
        <div className="leaflet-bottom leaflet-right">
            <div className="leaflet-control leaflet-bar">
                <button
                    onClick={handleRecenter}
                    title="Về vị trí của tôi"
                    style={{
                        width: '40px', height: '40px',
                        background: 'white', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#007bff', boxShadow: '0 1px 5px rgba(0,0,0,0.65)'
                    }}
                >
                    {/* Đảm bảo bạn đã import Navigation từ lucide-react */}
                    <Navigation size={20} fill="#007bff" />
                </button>
            </div>
        </div>
    );
};
// --- COMPONENT NÚT KÍCH HOẠT CHỈ ĐƯỜNG ---
const DirectionsControl = ({ onStart }) => {
    return (
        <div className="leaflet-bottom leaflet-left"> {/* Đặt ở góc dưới trái */}
            <div className="leaflet-control leaflet-bar">
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Ngăn click xuyên qua map
                        onStart();
                    }}
                    style={{
                        padding: '10px 15px',
                        backgroundColor: '#007bff', // Màu xanh chủ đạo
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                    }}
                >
                    <Navigation size={18} /> Chỉ đường tới đây
                </button>
            </div>
        </div>
    );
};

// --- COMPONENT VẼ ĐƯỜNG (ROUTING MACHINE) - ĐÃ FIX LỖI REMOVELAYER ---
const RoutingMachine = ({ userLat, userLon, shopLat, shopLon }) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // 1. Kiểm tra toạ độ để tránh lỗi Invalid LatLng
        if (userLat == null || userLon == null || shopLat == null || shopLon == null) {
            return;
        }

        // 2. Tạo control chỉ đường
        const routingControl = L.Routing.control({
            waypoints: [
                L.latLng(userLat, userLon),
                L.latLng(shopLat, shopLon)
            ],
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            showAlternatives: false,
            lineOptions: {
                styles: [{ color: '#007bff', weight: 5, opacity: 0.7 }]
            },
            createMarker: function () { return null; }
        }).addTo(map);

        // Ẩn bảng hướng dẫn text
        const container = routingControl.getContainer();
        if (container) {
            container.style.display = 'none';
        }

        // 3. CLEANUP FUNCTION (QUAN TRỌNG: SỬA LỖI REMOVELAYER TẠI ĐÂY)
        return () => {
            try {
                // 1. Ép Routing Machine xoá hết các điểm Waypoints
                // Việc này giúp hủy các lệnh vẽ đường đang chờ xử lý từ server
                if (routingControl) {
                    routingControl.getPlan().setWaypoints([]);

                    // 2. Sau đó mới xóa control khỏi bản đồ
                    if (map) {
                        map.removeControl(routingControl);
                    }
                }
            } catch (e) {
                console.warn("Lỗi dọn dẹp Routing:", e);
            }
        };
    }, [map, userLat, userLon, shopLat, shopLon]);

    return null;
};
// --- CSS GIAO DIỆN ---
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600;700&family=Mulish:wght@300;400;600;700;800&family=Roboto+Slab:wght@400;500;700;800&display=swap');

:root {
    --primary: #4e382d;
    --primary-dark: #3a2a22;
    --accent: #d4a373;
    --accent-hover: #c59360;
    --bg-body: #f7f5f0;
    --text-dark: #2c2420;
    --text-light: #6b7280;
    --white: #ffffff;
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.05);
    --shadow-md: 0 8px 24px rgba(0,0,0,0.08);
    --shadow-lg: 0 15px 40px rgba(0,0,0,0.12);
    --radius: 12px;
}

* { box-sizing: border-box; }
body { margin: 0; font-family: 'Mulish', sans-serif; background-color: var(--bg-body); color: var(--text-dark); line-height: 1.6; }
.container { max-width: 1100px; margin: 0 auto; padding: 0 20px; }
button { font-family: inherit; transition: all 0.2s; }
.fade-in { animation: fadeIn 0.4s ease-in; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* NAVBAR */
.navbar { background-color: var(--primary); color: white; padding: 12px 0; box-shadow: 0 4px 10px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 1000; }
.nav-inner { display: flex; justify-content: space-between; align-items: center; }

.logo { display: flex; align-items: center; gap: 12px; cursor: pointer; transition: transform 0.2s; }
.logo:hover { transform: scale(1.02); }
.logo-symbol { width: 42px; height: 42px; background: var(--accent); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.2); border: 2px solid rgba(255,255,255,0.2); }
.logo-text { font-family: 'Dancing Script', serif; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; line-height: 1; }

.auth-block { display: flex; gap: 12px; align-items: center; }
.nav-btn { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px 14px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; }
.nav-btn:hover { background: rgba(255,255,255,0.25); }
.nav-btn.active { background: var(--accent); border-color: var(--accent); color: white; }

.btn-secondary { background: white; color: var(--primary); border: none; font-weight: 700; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; }
.btn-secondary:hover { background: #f0f0f0; }
.user-profile { display: flex; align-items: center; gap: 10px; }
.avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--accent); object-fit: cover; }
.btn-logout { background: none; border: none; color: white; cursor: pointer; opacity: 0.8; }

/* HERO & SEARCH */
.hero-header { background: linear-gradient(rgba(78, 56, 45, 0.8), rgba(78, 56, 45, 0.6)), url('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop'); background-size: cover; background-position: center; color: white; padding: 70px 0 110px; text-align: center; transition: background 0.5s; }
.hero-header.challenge-mode { background: linear-gradient(rgba(45, 78, 56, 0.85), rgba(45, 78, 56, 0.6)), url('https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=2070&auto=format&fit=crop'); }
.hero-header h1 { font-family: 'Dancing Script', cursive; font-size: 64px; margin: 0 0 15px; font-weight: 700; text-shadow: 0 4px 10px rgba(0,0,0,0.3); }
.hero-header p { font-family: 'Mulish', sans-serif; font-size: 20px; opacity: 0.95; font-weight: 300; letter-spacing: 0.5px; }

.search-container-wrapper { margin-top: -55px; position: relative; z-index: 10; }
.search-bar-booking { background-color: var(--white); padding: 10px; border-radius: 16px; display: flex; gap: 10px; box-shadow: var(--shadow-lg); border: 4px solid rgba(212, 163, 115, 0.3); flex-wrap: wrap; }
.sb-item { display: flex; align-items: center; padding: 0 15px; height: 50px; flex: 1; border-right: 1px solid #eee; min-width: 200px; }
.sb-item:nth-last-child(2) { border-right: none; }
.sb-input-keyword { flex: 2; }
.sb-icon { color: var(--accent); margin-right: 10px; }
.sb-item input, .sb-item select { border: none; width: 100%; outline: none; font-size: 16px; color: var(--text-dark); background: transparent; font-weight: 600; font-family: 'Mulish', sans-serif; }
.sb-btn { background-color: var(--primary); color: white; border: none; font-weight: 700; font-size: 16px; padding: 0 35px; cursor: pointer; border-radius: 10px; }
.sb-btn:hover { background-color: var(--primary-dark); transform: translateY(-1px); }

/* MAIN LAYOUT */
.main-layout { display: flex; gap: 30px; margin-top: 50px; margin-bottom: 60px; }
.sidebar { width: 280px; flex-shrink: 0; }
.content-list { flex: 1; }

.filter-box { border: 1px solid #eee; border-radius: var(--radius); background: white; padding: 25px; margin-bottom: 25px; box-shadow: var(--shadow-sm); }
/* --- SỬA CSS TIÊU ĐỀ BỘ LỌC --- */

/* Tiêu đề mục lục */
.filter-box h3 {
    font-family: 'Roboto Slab', serif;
    font-size: 18px;
    color: var(--primary); /* Màu chữ nâu đậm */
    margin: 0 0 20px;
    padding-bottom: 12px; /* Khoảng cách giữa chữ và đường kẻ */
    position: relative;
    /* Bỏ border mờ cũ đi nếu có */
    border-bottom: none;
}

/* Đường gạch chân: Dài full 100% và Đậm màu */
.filter-box h3::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 40%; /* Kéo dài bằng chiều ngang ô */
    height: 3px; /* Độ dày */
    background-color: #d4a373; /* Màu kem đậm (Accent color) */
    opacity: 1; /* Giảm chút độ gắt nếu cần, hoặc để 1 */
    border-radius: 7px; /* Bo tròn đầu đường kẻ */
}
.filter-row { display: flex; gap: 10px; margin-bottom: 12px; font-size: 15px; align-items: center; cursor: pointer; }
.price-inputs { display: flex; gap: 8px; align-items: center; }
.price-inputs input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
/* --- PRICE INPUT WITH SUFFIX --- */
.price-input-wrapper {
    position: relative;
    flex: 1; /* Để nó co giãn đều */
}

/* Chỉnh lại input bên trong để chừa chỗ cho đuôi ,000 */
.price-input-wrapper input {
    width: 100%;
    padding: 10px 45px 10px 10px !important; /* Padding phải 45px để không đè chữ */
    border: 1px solid #ddd;
    border-radius: 6px;
    font-weight: 700;
    color: var(--primary);
    text-align: right; /* Số canh phải cho đẹp */
}

/* Đuôi ,000 giả */
.price-suffix {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #999;
    font-size: 13px;
    font-weight: 600;
    pointer-events: none; /* Để bấm xuyên qua được */
    background: white; /* Che viền nếu cần */
    padding-left: 2px;
}

/* SHOP CARD */
.shop-card-booking { display: flex; border-radius: var(--radius); overflow: hidden; background: white; margin-bottom: 25px; box-shadow: var(--shadow-sm); transition: all 0.3s; border: 1px solid #eee; cursor: pointer; }
.shop-card-booking:hover { box-shadow: var(--shadow-md); transform: translateY(-3px); border-color: var(--accent); }
.sc-img { width: 240px; min-height: 240px; position: relative; overflow: hidden; }
.sc-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
.shop-card-booking:hover .sc-img img { transform: scale(1.05); }
.sc-info { flex: 1; padding: 25px; display: flex; flex-direction: column; }
.sc-header { display: flex; justify-content: space-between; }
.sc-header h2 { margin: 0 0 8px; font-size: 22px; color: var(--primary); font-family: 'Roboto Slab', serif; }
.sc-badge { background-color: #008234; color: white; font-size: 11px; padding: 4px 10px; border-radius: 20px; display: inline-block; margin-bottom: 10px; font-weight: 700; text-transform: uppercase; }
.sc-price-col { width: 180px; text-align: right; display: flex; flex-direction: column; justify-content: center; padding: 20px; background: #fbfbfb; border-left: 1px solid #eee; }
.sc-price-value { font-size: 24px; font-weight: 800; color: var(--primary); font-family: 'Roboto Slab', serif; margin: 5px 0; }
.btn-view-detail { background-color: var(--accent); color: white; border: none; padding: 12px; border-radius: 6px; font-weight: 700; width: 100%; margin-top: 10px; display: flex; justify-content: center; gap: 5px; align-items: center; }
.btn-view-detail:hover { background-color: var(--accent-hover); }

/* CHALLENGE UI SPECIFIC */
.challenge-card { background: white; border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow-sm); border: 1px solid #eee; height: 100%; }
.video-frame { width: 100%; height: 400px; background: black; border-bottom: 4px solid var(--accent); }
.challenge-body { padding: 20px; }
.voucher-ticket { background: #fffcf5; border: 1px dashed var(--accent); padding: 15px; margin-top: 15px; border-radius: 8px; display: flex; gap: 15px; align-items: center; }
.points-badge { background: linear-gradient(45deg, #FFD700, #FFA500); color: white; font-weight: 800; padding: 5px 15px; border-radius: 20px; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 4px 10px rgba(255, 165, 0, 0.3); }

/* DETAIL PAGE & MAPS */
.detail-header-booking { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
.detail-title h1 { font-family: 'Roboto Slab', serif; font-size: 36px; color: var(--primary); margin: 0; line-height: 1.2; }
.detail-location { display: flex; align-items: center; gap: 6px; color: var(--text-light); margin-top: 10px; font-size: 15px; }
/* --- SỬA TRỰC TIẾP CLASS CŨ LUÔN --- */
.btn-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background-color: white;
    color: var(--primary);
    border: 1px solid #eee;
    border-radius: 30px; /* Bo tròn viên thuốc */
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    margin-bottom: 20px;
    font-family: 'Mulish', sans-serif;

    /* Reset các style mặc định cũ (nếu có) */
    text-decoration: none;
}

.btn-back:hover {
    background-color: var(--primary);
    color: white;
    transform: translateX(-5px); /* Hiệu ứng trượt */
    box-shadow: 0 5px 15px rgba(78, 56, 45, 0.2);
    border-color: var(--primary);
}
.detail-gallery { display: grid; grid-template-columns: 2fr 1fr; gap: 15px; height: 450px; margin-bottom: 40px; border-radius: var(--radius); overflow: hidden; }
.gallery-main img, .gallery-sub img { width: 100%; height: 100%; object-fit: cover; cursor: pointer; transition: opacity 0.2s; }
.gallery-sub { display: flex; flex-direction: column; gap: 15px; }
.gallery-sub img:hover { opacity: 0.9; }
.detail-content-layout { display: flex; gap: 30px; }
.dcl-main { flex: 1; }
.dcl-sidebar { width: 340px; }
.price-box-sticky { background: white; border: 1px solid #e0e0e0; padding: 25px; border-radius: var(--radius); position: sticky; top: 100px; box-shadow: var(--shadow-lg); }
.price-box-sticky h4 { font-family: 'Roboto Slab', serif; font-size: 20px; color: var(--primary); margin-top: 0; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
.btn-booking-primary { background-color: var(--primary); color: white; border: none; padding: 14px 25px; font-weight: 700; border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.3s; }
.btn-booking-primary:hover { background-color: var(--primary-dark); box-shadow: 0 4px 12px rgba(78, 56, 45, 0.3); }
.comment-item { padding: 20px 0; border-bottom: 1px solid #f0f0f0; display: flex; gap: 15px; }
.comment-avatar { width: 45px; height: 45px; background: var(--accent); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; flex-shrink: 0; }

.upload-box-modern { border: 2px dashed #ccc; border-radius: 16px; padding: 60px 20px; text-align: center; background: #fafafa; transition: all 0.3s; cursor: pointer; position: relative; overflow: hidden; }
.upload-box-modern:hover { border-color: var(--accent); background: #fffaf5; transform: scale(1.01); }
.upload-icon-circle { width: 80px; height: 80px; background: #eee; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #888; transition: all 0.3s; }
.upload-box-modern:hover .upload-icon-circle { background: var(--accent); color: white; }

/* MAP EMBED */
.map-container { width: 100%; height: 300px; border-radius: 12px; overflow: hidden; margin-top: 20px; border: 1px solid #ddd; }
.btn-directions { background: #fff; color: #007bff; border: 1px solid #007bff; margin-top: 10px; }
.btn-directions:hover { background: #f0f8ff; }

/* AUTH */
.auth-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(rgba(78, 56, 45, 0.4), rgba(78, 56, 45, 0.4)), url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop'); background-size: cover; display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(4px); }
.auth-card { background: rgba(255, 255, 255, 0.95); width: 420px; padding: 40px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative; animation: slideUp 0.4s ease-out; max-height: 90vh; overflow-y: auto; }
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.auth-title { text-align: center; font-family: 'Roboto Slab', serif; font-size: 28px; color: var(--primary); margin-bottom: 5px; margin-top: 0; }
.auth-subtitle { text-align: center; color: #666; font-size: 14px; margin-bottom: 30px; margin-top: 0; }
.modern-input { width: 100%; padding: 14px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; transition: border 0.3s; background: white; }
.modern-input:focus { border-color: var(--accent); outline: none; box-shadow: 0 0 0 3px rgba(212, 163, 115, 0.1); }
.btn-auth-full { width: 100%; background: var(--primary); color: white; padding: 14px; border: none; border-radius: 8px; font-weight: 700; font-size: 16px; cursor: pointer; transition: background 0.3s; }
.btn-auth-full:hover { background: var(--primary-dark); }
.auth-close { position: absolute; top: 15px; right: 15px; cursor: pointer; color: #999; }

/* CHATBOX */
.chat-btn { position: fixed; bottom: 30px; right: 30px; width: 64px; height: 64px; background-color: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 100; box-shadow: 0 4px 20px rgba(78, 56, 45, 0.4); transition: transform 0.2s; }
.chat-btn:hover { transform: scale(1.1); }
.chat-window { position: fixed; bottom: 100px; right: 30px; width: 360px; height: 450px; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); z-index: 9999; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #eee; }
.chat-header { background: var(--primary); color: white; padding: 15px; font-weight: 700; display: flex; justify-content: space-between; font-family: 'Mulish', sans-serif; }
.chat-content { flex: 1; padding: 20px; overflow-y: auto; background: #f9f9f9; }
.chat-msg { padding: 10px 15px; margin-bottom: 10px; border-radius: 16px; max-width: 85%; font-size: 14px; line-height: 1.4; }
.chat-msg.user { background: var(--accent); color: white; align-self: flex-end; margin-left: auto; border-bottom-right-radius: 2px; }
.chat-msg.bot { background: white; border: 1px solid #ddd; align-self: flex-start; border-bottom-left-radius: 2px; }
.chat-input { display: flex; border-top: 1px solid #eee; padding: 15px; background: white; }
.chat-input input { flex: 1; border: none; outline: none; padding: 5px; font-family: inherit; }

/* RESPONSIVE */
@media (max-width: 768px) {
    .main-layout, .detail-content-layout { flex-direction: column; }
    .sidebar, .dcl-sidebar { width: 100%; display: none; }
    .shop-card-booking { flex-direction: column; }
    .sc-img { width: 100%; height: 220px; }
    .sc-price-col { width: 100%; border: none; padding: 20px; background: white; text-align: left; border-top: 1px solid #eee; }
    .detail-gallery { height: 300px; }
    .search-bar-booking { flex-direction: column; height: auto; padding: 15px; }
    .sb-item { border-right: none; border-bottom: 1px solid #eee; padding: 0; margin-bottom: 10px; }
    .auth-card { width: 90%; padding: 25px; }
    .hero-header { padding: 40px 0 80px; }
    .hero-header h1 { font-size: 40px; }
    .map-container { height: 200px; }
}
/* DETAIL PAGE PROFESSIONAL LAYOUT */
.detail-container-pro { max-width: 960px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
.detail-header-pro { padding: 30px 40px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; background: #fff; }
.dh-info { flex: 1; }
.dh-price-box { text-align: right; min-width: 200px; padding-left: 20px; border-left: 1px solid #f0f0f0; }

.pro-title { font-family: 'Roboto Slab', serif; font-size: 32px; color: var(--primary); margin: 8px 0; line-height: 1.3; }
.pro-badge { background: #e6f6eb; color: #008234; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 4px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px; }
.pro-address { display: flex; align-items: center; gap: 6px; color: #555; font-size: 15px; margin-bottom: 10px; }
.pro-rating { display: flex; align-items: center; gap: 8px; margin-top: 10px; }

.pro-price { font-family: 'Roboto Slab', serif; font-size: 28px; color: var(--primary); font-weight: 800; }
.pro-sub-price { font-size: 13px; color: #888; margin-top: 4px; }

.map-section-pro { padding: 0; position: relative; height: 450px; background: #eee; }
.action-bar-pro { padding: 20px 40px; background: #fafafa; border-top: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }

/* --- NEW CHALLENGE UI STYLES --- */
.challenge-tabs { display: flex; justify-content: center; gap: 20px; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 0; }
.tab-btn { background: none; border: none; padding: 15px 25px; font-size: 16px; font-weight: 700; color: #888; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.3s; font-family: 'Mulish', sans-serif; }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--accent); }
.tab-btn:hover { color: var(--primary); }

.video-feed-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; }
.video-card-pro { background: white; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm); transition: transform 0.3s; border: 1px solid #eee; }
.video-card-pro:hover { transform: translateY(-5px); box-shadow: var(--shadow-md); border-color: var(--accent); }
.vc-frame { height: 740px; width: 100%; border-bottom: 1px solid #eee; }
.vc-info { padding: 20px; }
.vc-shop-name { font-family: 'Roboto Slab', serif; font-size: 18px; color: var(--primary); margin: 0 0 5px; }


.quest-list { display: flex; flex-direction: column; gap: 20px; max-width: 800px; margin: 0 auto; }
.quest-card {
    display: flex;
    background: white;
    border: 1px solid #eee;
    border-radius: 12px;
    /* overflow: hidden;  <--- XÓA HOẶC COMMENT DÒNG NÀY ĐI */
    overflow: visible; /* Thêm dòng này */
    padding: 20px;
    align-items: center;
    gap: 20px;
    box-shadow: var(--shadow-sm);
    position: relative; /* Thêm dòng này để căn chỉnh đường kẻ */
    z-index: 1;
}
.quest-card.completed { background: #f0fff4; border-color: #48bb78; }
.quest-icon { width: 60px; height: 60px; background: #fffaf0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--accent); border: 2px solid var(--accent); flex-shrink: 0; }
.quest-details { flex: 1; }
.quest-actions { display: flex; flex-direction: column; gap: 10px; min-width: 140px; }

.reward-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }
.voucher-ticket-pro { background: radial-gradient(circle at left, transparent 10px, #fff 11px), radial-gradient(circle at right, transparent 10px, #fff 11px); background-position: 0 0, 100% 0; background-size: 50% 100%; background-repeat: no-repeat; padding: 20px 30px; border-radius: 8px; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.1)); display: flex; align-items: center; gap: 20px; border: 1px solid #e0e0e0; position: relative; overflow: hidden; }
.voucher-ticket-pro::before { content: ""; position: absolute; top: 10px; bottom: 10px; left: 75%; border-left: 2px dashed #ddd; }
.v-left { flex: 1; padding-right: 20px; }
.v-right { width: 20%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-left: 10px; }
.point-cost { font-weight: 800; color: var(--accent); font-size: 18px; }

.progress-header { text-align: center; margin-bottom: 30px; padding: 20px; background: white; border-radius: 12px; box-shadow: var(--shadow-sm); }
.progress-bar-bg { width: 100%; height: 10px; background: #eee; border-radius: 5px; overflow: hidden; margin-top: 10px; }
.progress-bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--primary)); transition: width 0.5s ease; }

/* --- USER PROFILE STYLES --- */
.profile-container { max-width: 900px; margin: 40px auto; display: flex; gap: 30px; }
.profile-sidebar { width: 300px; background: white; border-radius: 12px; padding: 30px; text-align: center; box-shadow: var(--shadow-sm); border: 1px solid #eee; height: fit-content; }
.profile-main { flex: 1; background: white; border-radius: 12px; padding: 30px; box-shadow: var(--shadow-sm); border: 1px solid #eee; }

.p-avatar-large { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid var(--accent); margin-bottom: 15px; padding: 3px; background: white; }
.p-name { font-family: 'Roboto Slab', serif; font-size: 24px; color: var(--primary); margin: 5px 0; }
.p-username { color: #888; font-size: 14px; margin-bottom: 20px; }
.p-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
.p-stat-box { background: #fffcf5; padding: 15px; border-radius: 8px; border: 1px dashed var(--accent); }
.p-stat-num { font-size: 20px; font-weight: 800; color: var(--primary); }
.p-stat-label { font-size: 12px; color: #666; text-transform: uppercase; }

.info-group { margin-bottom: 20px; }
.info-label { font-size: 13px; color: #888; font-weight: 700; margin-bottom: 5px; display: block; }
.info-value { font-size: 16px; color: #333; font-weight: 500; border-bottom: 1px solid #eee; padding-bottom: 8px; width: 100%; display: block; }

/* FORGOT PASSWORD STEPS */
.step-dots { display: flex; justify-content: center; gap: 8px; margin-bottom: 20px; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: #eee; transition: all 0.3s; }
.dot.active { background: var(--accent); transform: scale(1.2); }

/* --- CSS MỚI CHO HIỆU ỨNG KẾT NỐI (TIMELINE) --- */

/* 1. Tạo đường nét đứt nối dọc xuống */
.quest-card::before {
    content: "";
    position: absolute;
    top: 50px; /* Bắt đầu từ tâm icon (padding 20px + nửa icon 30px) */
    left: 50px; /* Căn giữa tâm icon */
    width: 0px;
    height: calc(100% + 20px); /* Kéo dài hết thẻ + khoảng cách gap 20px */
    border-left: 2px dashed #d4a373; /* Màu đường kẻ */
    z-index: 0; /* Nằm dưới icon */
}

/* Ẩn đường kẻ ở thẻ cuối cùng */
.quest-card:last-child::before {
    display: none;
}

/* 2. Tạo dấu chấm tròn nhỏ ở giữa đoạn nối (trang trí) */
.quest-card:not(:last-child)::after {
    content: "";
    position: absolute;
    bottom: -14px; /* Nằm ở giữa khoảng trắng 20px */
    left: 46px; /* Căn giữa (50px - 4px radius) */
    width: 10px;
    height: 10px;
    background: #d4a373;
    border-radius: 50%;
    box-shadow: 0 0 0 4px #f7f5f0; /* Viền trùng màu nền body để tạo khoảng hở */
    z-index: 1;
}

/* 3. Đảm bảo Icon nằm đè lên đường kẻ */
.quest-icon {
    position: relative;
    z-index: 2; /* Nổi lên trên đường kẻ */
    background: #fffaf0; /* Đảm bảo có màu nền để che đường kẻ đi qua tâm */
}

/* --- CHAT PAGE FULL SCREEN STYLES --- */
.chat-page-container {
    max-width: 900px;
    margin: 0 auto;
    height: calc(100vh - 100px); /* Trừ chiều cao header */
    display: flex;
    flex-direction: column;
    background: white;
    border-radius: 16px;
    box-shadow: var(--shadow-md);
    overflow: hidden;
    border: 1px solid #eee;
}

.chat-header-pro {
    padding: 20px;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    gap: 15px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
}

.chat-body-pro {
    flex: 1;
    padding: 30px;
    overflow-y: auto;
    background: #fdfbf7; /* Màu kem rất nhạt */
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.chat-footer-pro {
    padding: 20px;
    background: white;
    border-top: 1px solid #eee;
    display: flex;
    gap: 10px;
    align-items: center;
}

.msg-bubble {
    max-width: 80%;
    padding: 14px 20px;
    border-radius: 18px;
    font-size: 15px;
    line-height: 1.6;
    position: relative;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.msg-bubble.user {
    background: var(--accent);
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
}

.msg-bubble.bot {
    background: white;
    color: var(--text-dark);
    align-self: flex-start;
    border-bottom-left-radius: 4px;
    border: 1px solid #eee;
}

.suggestion-chips {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 10px;
}

.chip {
    background: white;
    border: 1px solid var(--accent);
    color: var(--primary);
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 600;
}

.chip:hover {
    background: var(--accent);
    color: white;
}

.chat-input-pro {
    flex: 1;
    padding: 15px;
    border-radius: 30px;
    border: 1px solid #ddd;
    outline: none;
    font-family: inherit;
    background: #f9f9f9;
}
.chat-input-pro:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 3px rgba(212, 163, 115, 0.1);
}

/* --- ABOUT US SECTION (CẬP NHẬT GIAO DIỆN) --- */
.about-section {
    background-color: #f2ebe0; /* Màu nền nâu be nhạt */
    padding: 80px 0;
    margin-top: 80px;
    border-top: 4px solid var(--accent);

    /* Kỹ thuật ép full màn hình */
    width: 100vw;
    position: relative;
    left: 50%;
    right: 50%;
    margin-left: -50vw;
    margin-right: -50vw;
}

.about-title {
    font-family: 'Dancing Script', serif;
    font-size: 48px;
    font-weight: 700;
    color: var(--primary);
    margin: 0 0 25px;

    letter-spacing: -1px;
    line-height: 1.2;
}

.about-grid {
    display: grid;
    /* Chia cột: Bên trái chữ rộng (1.5 phần), bên phải ô vuông hẹp (1 phần) */
    grid-template-columns: 1.5fr 1fr;
    gap: 80px; /* Khoảng cách giữa chữ và các ô */
    align-items: center;
}

/* Grid chứa 4 ô vuông nhỏ */
.feature-box-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* 2 cột */
    gap: 20px;

    /* Giới hạn chiều rộng để các ô gom lại thành hình vuông nhỏ */
    max-width: 320px;
    margin-left: auto; /* Đẩy sang phải */
}

/* Thiết kế từng ô vuông */
.feature-mini-card {
    background: white;
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 4px 15px rgba(78, 56, 45, 0.08); /* Bóng nhẹ */
    border: 1px solid rgba(78, 56, 45, 0.1);
    transition: all 0.3s;

    /* Quan trọng: Tạo hình vuông và căn giữa nội dung */
    aspect-ratio: 1 / 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 15px;
}

.feature-mini-card:hover {
    transform: translateY(-5px);
    border-color: var(--accent);
    box-shadow: 0 10px 25px rgba(78, 56, 45, 0.15);
}

.feature-mini-card h4 {
    font-size: 14px;
    font-weight: 700;
    margin: 10px 0 5px 0;
    color: var(--primary);
}

.feature-mini-card small {
    font-size: 11px;
    color: #888;
    line-height: 1.3;
}

/* --- FOOTER CREDIT (MÀU NÂU ĐẬM & TO HƠN) --- */
.footer-credit {
    background: #4e382d; /* Màu nâu đậm chủ đạo */
    color: rgba(255,255,255,0.9);
    text-align: center;
    padding: 40px 0; /* Tăng chiều cao lên 40px */
    font-size: 15px;
    border-top: 1px solid rgba(255,255,255,0.1);

    /* Kỹ thuật ép full màn hình giống ở trên */
    width: 100vw;
    position: relative;
    left: 50%;
    right: 50%;
    margin-left: -50vw;
    margin-right: -50vw;
    margin-bottom: -50px; /* Lấp khoảng trắng dưới cùng nếu có */
}

`;

// --- COMPONENT: CHAT PAGE (FULL SCREEN) ---
function ChatPageUI({ onBack, user }) {
    const [history, setHistory] = useState([
        { role: 'bot', text: `Chào ${user ? user.name : 'bạn'}! 👋\nTôi là trợ lý AI chuyên về quà lưu niệm.\nTôi có thể giúp bạn tìm đặc sản, gợi ý quà tặng hoặc tư vấn địa điểm mua sắm.` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    // Tự động cuộn xuống cuối khi có tin nhắn mới
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [history, loading]);

    const handleSend = async (text = input) => {
        if (!text.trim()) return;

        // 1. Thêm tin nhắn user
        const userMsg = { role: 'user', text: text };
        setHistory(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // 2. Chuẩn bị payload gửi API
            const payload = {
                message: text,
                history: history.map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }]
                }))
            };

            // 3. Gọi API
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            // 4. Thêm tin nhắn Bot
            setHistory(prev => [...prev, { role: 'bot', text: data.reply || "Xin lỗi, tôi không hiểu ý bạn." }]);
        } catch (e) {
            setHistory(prev => [...prev, { role: 'bot', text: "⚠️ Lỗi kết nối với server." }]);
        }
        setLoading(false);
    };

    const suggestions = [
        "Đặc sản Quảng Ngãi làm quà?",
        "Mua đồ gốm ở đâu uy tín?",
        "Tư vấn quà tặng cho mẹ",
        "Món gì để được lâu?"
    ];

    return (
        <div className="container fade-in" style={{ paddingTop: '30px', paddingBottom: '30px' }}>
            <button className="btn-back" onClick={onBack} style={{ marginBottom: '15px' }}>
                <ChevronRight transform="rotate(180)" size={20} /> Quay lại
            </button>

            <div className="chat-page-container">
                {/* HEADER */}
                <div className="chat-header-pro">
                    <div style={{ width: '45px', height: '45px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        <MessageCircle size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontFamily: 'Roboto Slab', fontSize: '18px' }}>Trợ lý SLocal AI</h3>
                        <div style={{ fontSize: '13px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '8px', height: '8px', background: '#4cd964', borderRadius: '50%' }}></span>
                            Sẵn sàng hỗ trợ
                        </div>
                    </div>
                </div>

                {/* BODY */}
                <div className="chat-body-pro">
                    {history.map((msg, idx) => (
                        <div key={idx} className={`msg-bubble ${msg.role}`}>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                        </div>
                    ))}

                    {loading && (
                        <div className="msg-bubble bot">
                            <span className="loader" style={{ width: '20px', height: '20px', border: '3px solid #ccc', borderBottomColor: 'transparent' }}></span> Đang nhập...
                        </div>
                    )}

                    {/* Phần Gợi ý (Chỉ hiện khi history ít để đỡ rối) */}
                    {history.length < 3 && (
                        <div style={{ alignSelf: 'center', marginTop: '20px', textAlign: 'center' }}>
                            <p style={{ color: '#999', fontSize: '13px', marginBottom: '10px' }}>Gợi ý câu hỏi:</p>
                            <div className="suggestion-chips" style={{ justifyContent: 'center' }}>
                                {suggestions.map(s => (
                                    <div key={s} className="chip" onClick={() => handleSend(s)}>{s}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div ref={scrollRef} />
                </div>

                {/* FOOTER */}
                <div className="chat-footer-pro">
                    <input
                        className="chat-input-pro"
                        placeholder="Nhập câu hỏi của bạn..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        disabled={loading}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={loading}
                        style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }}
                    >
                        <Send size={22} style={{ marginLeft: '3px' }} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function ForgotPasswordForm({ onClose, onSwitchToLogin }) {
    const [step, setStep] = useState(1); // 1: Email, 2: Code, 3: New Pass
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [userId, setUserId] = useState(null); // Backend trả về ID sau khi gửi mail
    const [code, setCode] = useState('');
    const [newPass, setNewPass] = useState('');

    // BƯỚC 1: GỬI EMAIL
    const handleSendEmail = async () => {
        if (!email) return alert("Vui lòng nhập email");
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (data.success) {
                setUserId(data.user_id); // Lưu user_id để dùng cho bước sau
                setStep(2);
            } else {
                alert(data.error || "Email không tồn tại");
            }
        } catch (e) { alert("Lỗi kết nối server"); }
        setLoading(false);
    };

    // BƯỚC 2: XÁC THỰC CODE
    const handleVerifyCode = async () => {
        if (!code) return alert("Vui lòng nhập mã");
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/verify-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, reset_code: code })
            });
            const data = await res.json();
            if (data.valid) {
                setStep(3);
            } else {
                alert(data.error || "Mã không đúng hoặc đã hết hạn");
            }
        } catch (e) { alert("Lỗi kết nối server"); }
        setLoading(false);
    };

    // BƯỚC 3: ĐỔI MẬT KHẨU
    const handleResetPass = async () => {
        if (!newPass) return alert("Vui lòng nhập mật khẩu mới");
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, reset_code: code, new_password: newPass })
            });
            const data = await res.json();
            if (data.success) {
                alert("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
                onSwitchToLogin(); // Chuyển về trang login
            } else {
                alert(data.error);
            }
        } catch (e) { alert("Lỗi kết nối server"); }
        setLoading(false);
    };

    return (
        <div className="auth-overlay">
            <div className="auth-card">
                <div className="auth-close" onClick={onClose}><X size={24} /></div>

                <h2 className="auth-title">Khôi phục tài khoản</h2>
                <div className="step-dots">
                    <div className={`dot ${step >= 1 ? 'active' : ''}`}></div>
                    <div className={`dot ${step >= 2 ? 'active' : ''}`}></div>
                    <div className={`dot ${step >= 3 ? 'active' : ''}`}></div>
                </div>

                {step === 1 && (
                    <div className="fade-in">
                        <p className="auth-subtitle">Nhập email đã đăng ký để nhận mã xác nhận.</p>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: '#aaa' }} />
                            <input
                                className="modern-input" style={{ paddingLeft: '45px' }}
                                placeholder="Email của bạn" type="email"
                                value={email} onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                        <button className="btn-auth-full" onClick={handleSendEmail} disabled={loading}>
                            {loading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="fade-in">
                        <p className="auth-subtitle">Nhập mã 6 số đã được gửi tới <b>{email}</b></p>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: '#aaa' }} />
                            <input
                                className="modern-input" style={{ paddingLeft: '45px', letterSpacing: '5px', fontWeight: 'bold' }}
                                placeholder="######" maxLength="6"
                                value={code} onChange={e => setCode(e.target.value)}
                            />
                        </div>
                        <button className="btn-auth-full" onClick={handleVerifyCode} disabled={loading}>
                            {loading ? 'Đang kiểm tra...' : 'Xác thực'}
                        </button>
                        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: '#666', cursor: 'pointer' }} onClick={() => setStep(1)}>
                            Gửi lại mã?
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="fade-in">
                        <p className="auth-subtitle">Thiết lập mật khẩu mới.</p>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: '#aaa' }} />
                            <input
                                className="modern-input" style={{ paddingLeft: '45px' }}
                                placeholder="Mật khẩu mới" type="password"
                                value={newPass} onChange={e => setNewPass(e.target.value)}
                            />
                        </div>
                        <button className="btn-auth-full" onClick={handleResetPass} disabled={loading}>
                            {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                        </button>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
                    <span
                        style={{ color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}
                        onClick={onSwitchToLogin}
                    >
                        Quay lại Đăng nhập
                    </span>
                </div>
            </div>
        </div>
    );
}

function UserProfileUI({ user, setUser, onLogout }) { // Thêm prop setUser
    const [uploading, setUploading] = useState(false);

    // Xử lý khi chọn ảnh mới
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const fd = new FormData();
        fd.append('avatar', file);

        try {
            // Giả sử API endpoint là /api/update-avatar
            // Bạn cần đảm bảo Backend có route này
            const res = await fetch(`${API_BASE}/api/update-avatar`, {
                method: 'POST',
                body: fd,
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                // Cập nhật lại state user ở App.js để giao diện đổi ngay lập tức
                setUser(prev => ({ ...prev, avatar: data.new_avatar_url }));
                alert("Cập nhật ảnh đại diện thành công!");
            } else {
                alert(data.error || "Lỗi cập nhật ảnh");
            }
        } catch (err) {
            alert("Lỗi kết nối server");
        }
        setUploading(false);
    };

    if (!user) return <div className="container" style={{ padding: '50px', textAlign: 'center' }}>Vui lòng đăng nhập</div>;

    return (
        <div className="fade-in profile-container">
            {/* CỘT TRÁI: AVATAR & THỐNG KÊ NHANH */}
            <div className="profile-sidebar">

                {/* --- PHẦN SỬA ĐỔI: WRAPPER ĐỂ CLICK UPLOAD --- */}
                <div
                    style={{ position: 'relative', width: '120px', margin: '0 auto 15px', cursor: 'pointer' }}
                    onClick={() => !uploading && document.getElementById('avatar-upload').click()}
                >
                    <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                        alt="avatar"
                        className="p-avatar-large"
                        style={{ opacity: uploading ? 0.5 : 1, width: '100%', height: '120px', margin: 0 }}
                    />

                    {/* Icon máy ảnh hiện lên góc */}
                    <div style={{
                        position: 'absolute', bottom: '0', right: '0',
                        background: 'var(--accent)', color: 'white',
                        width: '32px', height: '32px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid white'
                    }}>
                        {uploading ? <span className="loader" style={{ width: '12px', height: '12px', border: '2px solid white' }}></span> : <Camera size={16} />}
                    </div>

                    {/* Input ẩn */}
                    <input
                        type="file"
                        id="avatar-upload"
                        hidden
                        accept="image/*"
                        onChange={handleAvatarChange}
                        disabled={uploading}
                    />
                </div>
                {/* ------------------------------------------- */}

                <h2 className="p-name">{user.name}</h2>
                <div className="p-username">@{user.username}</div>

                <div className="p-stat-grid">
                    <div className="p-stat-box">
                        <div className="p-stat-num">{user.points || 0}</div>
                        <div className="p-stat-label">Điểm</div>
                    </div>
                    <div className="p-stat-box">
                        <div className="p-stat-num">0</div>
                        <div className="p-stat-label">Voucher</div>
                    </div>
                </div>

                <button
                    className="btn-secondary"
                    style={{ marginTop: '25px', width: '100%', color: '#e53e3e', borderColor: '#e53e3e' }}
                    onClick={onLogout}
                >
                    <LogOut size={16} style={{ marginRight: '5px' }} /> Đăng xuất
                </button>
            </div>

            {/* CỘT PHẢI: THÔNG TIN CHI TIẾT (GIỮ NGUYÊN) */}
            <div className="profile-main">
                <h3 style={{ fontFamily: 'Roboto Slab', fontSize: '20px', color: 'var(--primary)', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                    Thông tin tài khoản
                </h3>

                <div className="info-group">
                    <label className="info-label">Họ và tên</label>
                    <span className="info-value">{user.name}</span>
                </div>

                <div className="info-group">
                    <label className="info-label">Email</label>
                    <span className="info-value">{user.email || "Chưa cập nhật"}</span>
                </div>

                <div className="info-group">
                    <label className="info-label">Tên đăng nhập</label>
                    <span className="info-value">{user.username}</span>
                </div>

                <div className="info-group">
                    <label className="info-label">Vai trò</label>
                    <span className="info-value">Thành viên</span>
                </div>

                <div style={{ marginTop: '40px', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Trophy size={20} color="var(--accent)" /> Hạng thành viên
                    </h4>
                    <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                        Tích cực tham gia thử thách Check-in để nhận thêm điểm và đổi quà hấp dẫn!
                    </p>
                </div>
            </div>
        </div>
    );
}

// --- COMPONENT: SHOP CARD (Dùng chung cho Home & Search Image) ---
const ShopCard = ({ shop, onClick }) => {
    return (
        <div className="shop-card-booking" onClick={onClick} style={{ minHeight: '160px', marginBottom: '20px' }}>
            {/* 1. ẢNH ĐẠI DIỆN */}
            <div className="sc-img" style={{ width: '220px', minHeight: 'auto' }}>
                <img
                    // Logic ảnh: Nếu shop có ảnh thật thì dùng, không thì dùng unsplash theo category
                    src={shop.image || DEFAULT_IMAGE}
                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMAGE; }}
                    alt={shop.name}
                    style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                />
            </div>

            {/* 2. THÔNG TIN CHÍNH */}
            <div className="sc-info" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 30px' }}>
                {/* Dòng 1: Tên Shop & Rating */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', width: '100%' }}>
                    <h2 style={{ fontSize: '20px', margin: 0, color: '#4e382d', fontFamily: 'Roboto Slab, serif' }}>
                        {shop.name}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <span style={{ fontWeight: 'bold', color: '#2c2420', fontSize: '15px' }}>{shop.rating || 4.5}</span>
                        <Star size={16} fill="#f5a623" color="#f5a623" />
                    </div>
                </div>

                {/* Dòng 2: Địa chỉ */}
                <div style={{ fontSize: '15px', color: '#555', lineHeight: '1.6' }}>
                    <MapPin size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                    <span style={{ fontWeight: '500' }}>{shop.city}</span>
                    <span style={{ margin: '0 8px', color: '#ccc' }}>•</span>
                    <span style={{ color: '#666' }}>{shop.address}</span>
                </div>

                {/* Dòng 3: Items match (Dành riêng cho Search Image nếu có) */}
                {shop.matched_items && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#008234', background: '#e6f6eb', padding: '5px 10px', borderRadius: '4px', width: 'fit-content' }}>
                        <CheckCircle size={12} style={{ marginRight: '5px' }} />
                        Có bán: <b>{shop.matched_items}</b>
                    </div>
                )}
            </div>

            {/* 3. CỘT GIÁ VÀ NÚT */}
            <div className="sc-price-col" style={{ justifyContent: 'center', width: '200px', borderLeft: '1px solid #f0f0f0' }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Giá tham khảo</div>
                    <div className="sc-price-value" style={{ fontSize: '24px', color: '#4e382d' }}>
                        {new Intl.NumberFormat('vi-VN').format(shop.price)},000 ₫
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>Đã bao gồm thuế</div>
                </div>

                <button className="btn-view-detail" style={{ marginTop: '20px', background: '#d4a373', fontSize: '14px', padding: '10px' }}>
                    Xem chi tiết <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

// --- COMPONENT CHÍNH ---
export default function App() {
    const [view, setView] = useState('home'); // home, detail, imageSearch, challenge, register, login
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    // Dữ liệu Shops & Filters
    const [shops, setShops] = useState([]);
    const [inputKeyword, setInputKeyword] = useState('');
    const [filters, setFilters] = useState({
        keyword: '', city: 'all', category: 'all',
        rating: 0, from_price: '', to_price: '',
        lat: null, lon: null, radius: null // Thêm 3 tham số này
    });
    const [metaData, setMetaData] = useState({ cities: [], categories: [] });

    // Chi tiết Shop & Chat
    const [selectedShop, setSelectedShop] = useState(null);
    const [shopComments, setShopComments] = useState([]);

    // Chatbot AI
    const [showChat, setShowChat] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef(null);
    // THÊM STATE MỚI ĐỂ LƯU VỊ TRÍ CỦA TÔI
    const [myLocation, setMyLocation] = useState(null);

    // 2. HÀM XỬ LÝ KHI BẤM NÚT "CHỈ ĐƯỜNG"
    const handleStartNavigation = () => {
        if (navigator.geolocation) {
            // Có thể thêm loading state ở đây nếu muốn
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setMyLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                },
                () => alert("Không thể lấy vị trí. Vui lòng kiểm tra quyền GPS.")
            );
        } else {
            alert("Trình duyệt không hỗ trợ định vị.");
        }
    };

    // 1. KHỞI TẠO: CHECK LOGIN
    useEffect(() => {
        fetch(`${API_BASE}/api/current-user`, { credentials: 'include' })
            .then(res => res.json())
            .then(data => { if (data.is_authenticated) setUser(data.user); });
    }, []);

    // 2. LOAD SHOPS (Chỉ chạy khi view là home)
    useEffect(() => {
        if (view !== 'home') return;
        setLoading(true);
        const params = new URLSearchParams();

        // Mapping các state vào tham số URL backend yêu cầu
        if (filters.keyword) params.append('keyword', filters.keyword);
        if (filters.city !== 'all') params.append('city', filters.city);
        if (filters.category !== 'all') params.append('category', filters.category);

        // Rating (backend logic: lấy shop có rating >= giá trị gửi lên)
        if (filters.rating > 0) params.append('rating', filters.rating);

        // Giá (from_price, to_price)
        if (filters.from_price) params.append('from_price', filters.from_price);
        if (filters.to_price) params.append('to_price', filters.to_price);

        // Vị trí (Quan trọng: Phải gửi đủ 3 cái này backend mới tính khoảng cách)
        if (filters.lat && filters.lon) {
            params.append('lat', filters.lat);
            params.append('lon', filters.lon);
            params.append('radius', filters.radius || 5); // Mặc định tìm trong 5km
        }

        fetch(`${API_BASE}/api/shops?${params.toString()}`) //
            .then(res => res.json())
            .then(data => {
                setShops(data.data);
                if (data.filters) setMetaData({
                    cities: data.filters.cities || [],
                    categories: data.filters.categories || []
                });
                setLoading(false);
            })
            .catch(err => { console.error(err); setLoading(false); });
    }, [filters, view]);

    // Scroll chat xuống cuối
    useEffect(() => {
        if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const doSearch = () => setFilters(prev => ({ ...prev, keyword: inputKeyword }));

    // Xử lý đăng nhập
    const handleLogin = async (username, password) => {
        try {
            const res = await fetch(`${API_BASE}/api/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) { setUser(data.user); setView('home'); }
            else alert(data.error);
        } catch { alert('Lỗi kết nối server!'); }
    };

    // Xử lý đăng ký (Có upload avatar)
    const handleRegister = async (formData) => {
        try {
            const res = await fetch(`${API_BASE}/api/register`, {
                method: 'POST',
                body: formData, // Gửi dạng multipart/form-data
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                alert("Đăng ký thành công! Vui lòng đăng nhập.");
                setView('login');
            }
            else alert(data.error);
        } catch { alert('Lỗi kết nối server!'); }
    }

    const openDetail = async (id) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/shops/${id}`);
            const data = await res.json();
            if (data.error) {
                alert(data.error);
            } else {
                setSelectedShop(data.shop);
                setShopComments(data.comments);
                setView('detail');
            }
        } catch { alert('Không tải được chi tiết shop!'); }
        setLoading(false);
    };

    const sendChat = async () => {
        if (!chatInput.trim()) return;
        const userText = chatInput;
        setChatInput('');
        setChatHistory(prev => [...prev, { role: 'user', text: userText }]);

        try {
            // Chuẩn bị payload đúng format backend
            const payload = {
                message: userText,
                history: chatHistory.map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }]
                }))
            };

            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            setChatHistory(prev => [...prev, { role: 'bot', text: data.reply || "Xin lỗi, tôi chưa hiểu ý bạn." }]);
        } catch {
            setChatHistory(prev => [...prev, { role: 'bot', text: "Lỗi kết nối AI." }]);
        }
    };

    return (
        <div className="app-container">
            <style>{styles}</style>

            {/* --- NAVBAR --- */}
            <nav className="navbar">
                <div className="container nav-inner">
                    <div className="logo" onClick={() => setView('home')}>
                        <img
                            src="/logo.png"
                            alt="Logo"
                            style={{ width: '50px', height: '50px', objectFit: 'contain', marginRight: '10px' }}
                        />
                        <span className="logo-text">SLocaL</span>
                    </div>

                    <div className="auth-block">
                        <button
                            className={`nav-btn ${view === 'challenge' ? 'active' : ''}`}
                            onClick={() => setView('challenge')}
                        >
                            <Trophy size={18} /> Thử thách
                        </button>

                        <button
                            className={`nav-btn ${view === 'imageSearch' ? 'active' : ''}`}
                            onClick={() => setView('imageSearch')}
                        >
                            <Camera size={18} /> Tìm bằng ảnh
                        </button>

                        <button
                            className={`nav-btn ${view === 'chat' ? 'active' : ''}`}
                            onClick={() => setView('chat')} // Chuyển thẳng sang trang Chat Full
                        >
                            <MessageCircle size={18} /> Trợ lý AI
                        </button>

                        {user ? (
                            <div className="user-profile">
                                {/* Click vào avatar hoặc tên để mở trang Profile */}
                                <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                                    onClick={() => setView('profile')}
                                >
                                    <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`} className="avatar" alt="avt" />
                                    <div className="user-info-text">
                                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{user.name}</div>
                                    </div>
                                </div>
                                <button className="btn-logout" onClick={async () => {
                                    await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' }); setUser(null); setView('home');
                                }}><LogOut size={16} /></button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-secondary" onClick={() => setView('register')}>Đăng ký</button>
                                <button className="btn-secondary" onClick={() => setView('login')}>Đăng nhập</button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* --- NỘI DUNG CHÍNH --- */}
            <main>
                {/* === VIEW: HOME === */}
                {view === 'home' && (
                    <div className="fade-in">
                        {/* HERO HEADER */}
                        <div className="hero-header">
                            <div className="container">
                                <h1>Tìm món quà hoàn hảo cho chuyến đi!</h1>
                                <p>Khám phá hàng ngàn trung tâm thương mại & cửa hàng lưu niệm độc đáo.</p>
                            </div>
                        </div>

                        {/* SEARCH BAR */}
                        <div className="container search-container-wrapper">
                            <div className="search-bar-booking">
                                <div className="sb-item sb-input-keyword">
                                    <Search className="sb-icon" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Bạn muốn tìm món gì?"
                                        value={inputKeyword}
                                        onChange={e => setInputKeyword(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && doSearch()}
                                    />
                                </div>
                                <div className="sb-item">
                                    <MapPin className="sb-icon" size={20} />
                                    <select
                                        value={filters.city}
                                        onChange={e => setFilters({ ...filters, city: e.target.value })}
                                    >
                                        <option value="all">Mọi nơi</option>
                                        {metaData.cities.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="sb-item">
                                    <ShoppingBag className="sb-icon" size={20} />
                                    <select
                                        value={filters.category}
                                        onChange={e => setFilters({ ...filters, category: e.target.value })}
                                    >
                                        <option value="all">Tất cả loại</option>
                                        {metaData.categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <button className="sb-btn" onClick={doSearch}>Tìm kiếm</button>
                            </div>
                        </div>
                        <div className="container main-layout">
                            {/* --- SIDEBAR BẮT ĐẦU TỪ ĐÂY --- */}
                            <div className="sidebar">

                                {/* 1. BOX LỌC ĐÁNH GIÁ (Rating) */}
                                <div className="filter-box">
                                    <h3>Đánh giá</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="number"
                                            className="modern-input"
                                            style={{ width: '70px', margin: 0, padding: '8px', textAlign: 'center', fontWeight: 'bold' }}
                                            min="0" max="5" step="0.5" placeholder="0"
                                            value={filters.rating > 0 ? filters.rating : ''}
                                            onChange={e => {
                                                let val = parseFloat(e.target.value);
                                                if (val > 5) val = 5;
                                                if (val < 0) val = 0;
                                                setFilters({ ...filters, rating: val });
                                            }}
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                          
                                                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>Sao trở lên</span>
                                            </div>
                                            <small style={{ color: '#999', fontSize: '11px' }}>Nhập số sao (VD: 4.5)</small>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. BOX LỌC VỊ TRÍ (Nearby) */}
                                <div className="filter-box">
                                    <h3>Vị trí</h3>
                                    <div className="filter-row">
                                        <input
                                            type="checkbox"
                                            id="chk-nearby"
                                            style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                            checked={!!filters.lat}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    if (navigator.geolocation) {
                                                        navigator.geolocation.getCurrentPosition(
                                                            (position) => {
                                                                setFilters({
                                                                    ...filters,
                                                                    lat: position.coords.latitude,
                                                                    lon: position.coords.longitude,
                                                                    radius: 10
                                                                });
                                                            },
                                                            () => {
                                                                alert("Không thể lấy vị trí. Vui lòng bật GPS.");
                                                                e.target.checked = false;
                                                            }
                                                        );
                                                    } else {
                                                        alert("Trình duyệt không hỗ trợ định vị.");
                                                    }
                                                } else {
                                                    setFilters({ ...filters, lat: null, lon: null, radius: null });
                                                }
                                            }}
                                        />
                                        <label htmlFor="chk-nearby" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', marginLeft: '5px' }}>
                                            <span style={{ fontWeight: '600' }}>Gần tôi nhất</span>
                                            <span style={{ fontSize: '12px', color: '#666' }}>Bán kính tìm kiếm 10km</span>
                                        </label>
                                    </div>
                                </div>

                                {/* 3. BOX LỌC NGÂN SÁCH (Budget) */}
                                <div className="filter-box">
                                    <h3>Ngân sách</h3>
                                    <div className="price-inputs" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

                                        {/* Ô nhập giá TỪ */}
                                        <div className="price-input-wrapper">
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={filters.from_price}
                                                onChange={e => setFilters({ ...filters, from_price: e.target.value })}
                                            />
                                            <span className="price-suffix">,000đ</span>
                                        </div>

                                        <span style={{ fontWeight: 'bold', color: '#ccc' }}>-</span>

                                        {/* Ô nhập giá ĐẾN */}
                                        <div className="price-input-wrapper">
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={filters.to_price}
                                                onChange={e => setFilters({ ...filters, to_price: e.target.value })}
                                            />
                                            <span className="price-suffix">,000đ</span>
                                        </div>
                                    </div>

                                    
                                </div>
                            </div>
                            {/* --- KẾT THÚC SIDEBAR --- */}

                            {/* SHOP LIST */}
                            <div className="content-list">
                                {loading ? <div style={{ textAlign: 'center', padding: '20px' }}><span className="loader"></span> Đang tải...</div> : (
                                    <div>
                                        {shops.length > 0 ? shops.map(shop => (
                                            <div key={shop.id} className="shop-card-booking" onClick={() => openDetail(shop.id)} style={{ minHeight: '160px' }}>

                                                {/* 1. ẢNH ĐẠI DIỆN */}
                                                <div className="sc-img" style={{ width: '220px', minHeight: 'auto' }}>
                                                    <img
                                                        src={shop.image || DEFAULT_IMAGE}
                                                        onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMAGE; }}
                                                        alt={shop.name}
                                                        style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                                                    />
                                                </div>

                                                {/* 2. THÔNG TIN CHÍNH (Sửa đổi layout) */}
                                                <div className="sc-info" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 30px' }}>

                                                    {/* Dòng 1: Tên Shop (Trái) - Rating (Phải) */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', width: '100%' }}>
                                                        {/* Tên Shop to hơn (26px) */}
                                                        <h2 style={{ fontSize: '20px', margin: 0, color: '#4e382d', fontFamily: 'Roboto Slab, serif' }}>
                                                            {shop.name}
                                                        </h2>

                                                        {/* Rating căn phải */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                            <span style={{ fontWeight: 'bold', color: '#2c2420', fontSize: '15px' }}>{shop.rating || 4.5}</span>
                                                            <Star size={16} fill="#f5a623" color="#f5a623" />
                                                        </div>
                                                    </div>

                                                    {/* Dòng 2: Địa chỉ (Màu thường, bỏ in xanh, bỏ gạch chân) */}
                                                    <div style={{ fontSize: '15px', color: '#555', lineHeight: '1.6' }}>
                                                        <span style={{ fontWeight: '500' }}>{shop.city}</span>
                                                        <span style={{ margin: '0 8px', color: '#ccc' }}>•</span>
                                                        <span style={{ color: '#666' }}>{shop.address}</span>
                                                    </div>
                                                </div>

                                                {/* 3. CỘT GIÁ VÀ NÚT */}
                                                <div className="sc-price-col" style={{ justifyContent: 'center', width: '200px', borderLeft: '1px solid #f0f0f0' }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Giá tham khảo</div>
                                                        <div className="sc-price-value" style={{ fontSize: '24px', color: '#4e382d' }}>
                                                            {/* Format giá + thêm đuôi ,000 */}
                                                            {new Intl.NumberFormat('vi-VN').format(shop.price)},000 ₫
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#999' }}>Đã bao gồm thuế</div>
                                                    </div>

                                                    <button className="btn-view-detail" style={{ marginTop: '20px', background: '#d4a373', fontSize: '14px', padding: '10px' }}>
                                                        Xem chi tiết <ChevronRight size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                                                Không tìm thấy cửa hàng nào phù hợp.
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                )}

                

                {/* === VIEW: CHALLENGE === */}
                {view === 'challenge' && (
                    <ChallengeUI
                        user={user}
                        onLoginRequest={() => setView('login')}
                        onBack={() => setView('home')}  // <--- THÊM DÒNG NÀY
                    />
                )}

                {/* === THÊM PHẦN NÀY: VIEW IMAGE SEARCH === */}
                {view === 'imageSearch' && (
                    <ImageSearchUI
                        onBack={() => setView('home')}
                        onOpenShop={(id) => openDetail(id)} // Truyền hàm openDetail vào đây
                    />
                )}
                {/* === VIEW: FORGOT PASSWORD === */}
                {view === 'forgotPassword' && (
                    <ForgotPasswordForm
                        onClose={() => setView('home')}
                        onSwitchToLogin={() => setView('login')}
                    />
                )}

                {/* === VIEW: USER PROFILE === */}
                {view === 'profile' && user && (
                    <UserProfileUI
                        user={user}
                        setUser={setUser}
                        onLogout={async () => {
                            await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' });
                            setUser(null);
                            setView('home');
                        }}
                    />
                )}

                {/* === LOGIN / REGISTER (Cập nhật logic chuyển forgot password) === */}
                {(view === 'login' || view === 'register') && (
                    <AuthForm
                        type={view}
                        onSwitch={(target) => {
                            // Nếu target là string đặc biệt 'forgot-password' thì setView
                            if (target === 'forgot-password') setView('forgotPassword');
                            else setView(view === 'login' ? 'register' : 'login');
                        }}
                        onLogin={handleLogin}
                        onRegister={handleRegister}
                        onClose={() => setView('home')}
                    />
                )}

                {/* === VIEW: DETAIL (Giao diện Professional) === */}
                {view === 'detail' && selectedShop && (
                    <div className="fade-in" style={{ paddingBottom: '60px' }}>

                        {/* Breadcrumb / Nút quay lại */}
                        <div className="container" style={{ marginTop: '20px' }}>
                            <button className="btn-back" onClick={() => setView('home')} style={{ color: '#666', fontSize: '14px' }}>
                                <ChevronRight transform="rotate(180)" size={16} /> Quay lại danh sách
                            </button>
                        </div>

                        <div className="detail-container-pro">

                            {/* 1. HEADER: CHIA 2 CỘT (Thông tin Trái - Giá Phải) */}
                            <div className="detail-header-pro">

                                {/* Cột Trái: Thông tin */}
                                <div className="dh-info">
                                    <span className="pro-badge">
                                        {selectedShop.category || "Địa điểm"}
                                    </span>
                                    <h1 className="pro-title">{selectedShop.name}</h1>

                                    <div className="pro-address">
                                        <MapPin size={18} color="#888" />
                                        <span>{selectedShop.address}, {selectedShop.city}</span>
                                    </div>

                                    <div className="pro-rating">
                                        <div style={{ display: 'flex' }}>
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star key={s} size={18} fill={s <= (selectedShop.rating || 5) ? "#f5a623" : "#e0e0e0"} color="none" />
                                            ))}
                                        </div>
                                        <span style={{ fontWeight: 'bold', color: '#333', fontSize: '14px' }}>
                                            {selectedShop.rating || 5.0} / 5.0
                                        </span>
                                        <span style={{ color: '#ccc' }}>•</span>
                                        <span style={{ color: '#666', fontSize: '14px', textDecoration: 'underline', cursor: 'pointer' }}>Xem {shopComments.length} đánh giá</span>
                                    </div>
                                </div>

                                {/* Cột Phải: Giá & Trạng thái */}
                                <div className="dh-price-box">
                                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>Giá tham khảo</div>
                                    <div className="pro-price">
                                        {new Intl.NumberFormat('vi-VN').format(selectedShop.price)},000 ₫
                                    </div>
                                    <div className="pro-sub-price">Đã bao gồm thuế</div>
                                    <div style={{ marginTop: '15px', display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#008234', fontSize: '13px', fontWeight: 'bold', background: '#e6f6eb', padding: '5px 10px', borderRadius: '20px' }}>
                                        <CheckCircle size={14} /> Đang mở cửa
                                    </div>
                                </div>
                            </div>

                            {/* 2. BẢN ĐỒ FULL-WIDTH VỚI LEAFLET */}
                            <div className="map-section-pro" style={{ height: '500px', width: '100%', zIndex: 0 }}>
                                {selectedShop.lat && selectedShop.lon && !isNaN(selectedShop.lat) ? (
                                    <MapContainer
                                        /* QUAN TRỌNG: Key giúp React huỷ map cũ và vẽ map mới khi ID thay đổi */
                                        key={selectedShop.id}

                                        /* Ép kiểu số thực để tránh lỗi */
                                        center={[parseFloat(selectedShop.lat), parseFloat(selectedShop.lon)]}
                                        
                                        zoom={16} // Zoom gần shop hơn một chút
                                        scrollWheelZoom={false}
                                        style={{ height: "100%", width: "100%" }}
                                    >
                                        <TileLayer
                                            attribution='© OpenStreetMap'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />

                                        {/* LUÔN LUÔN HIỂN THỊ MARKER CỬA HÀNG */}
                                        <Marker position={[selectedShop.lat, selectedShop.lon]}>
                                            <Popup>
                                                <b>{selectedShop.name}</b><br />{selectedShop.address}
                                            </Popup>
                                        </Marker>

                                        {/* LOGIC HIỂN THỊ THEO TRẠNG THÁI */}
                                        {myLocation ? (
                                            // TRƯỜNG HỢP 1: ĐÃ CÓ GPS (Đã bấm nút chỉ đường)
                                            <>
                                                <Marker position={[myLocation.lat, myLocation.lon]}>
                                                    <Popup>Vị trí của bạn</Popup>
                                                </Marker>

                                                {/* Vẽ đường đi */}
                                                <RoutingMachine
                                                    userLat={myLocation.lat}
                                                    userLon={myLocation.lon}
                                                    shopLat={selectedShop.lat}
                                                    shopLon={selectedShop.lon}
                                                />

                                                {/* Nút về vị trí hiện tại (Chỉ hiện khi đã có GPS) */}
                                                <RecenterControl
                                                    lat={myLocation.lat}
                                                    lon={myLocation.lon}
                                                />
                                            </>
                                        ) : (
                                            // TRƯỜNG HỢP 2: CHƯA CÓ GPS (Mới vào xem)
                                            // Hiển thị nút "Chỉ đường tới đây"
                                            <DirectionsControl onStart={handleStartNavigation} />
                                        )}

                                    </MapContainer>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', background: '#eee' }}>
                                        Không có dữ liệu bản đồ
                                    </div>
                                )}
                            </div>

                            {/* 3. THANH TÁC VỤ (ACTION BAR) */}
                            <div className="action-bar-pro">
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                    <div style={{ width: '40px', height: '40px', background: '#e0e0e0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <MessageCircle size={20} color="#555" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Hỗ trợ trực tuyến</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>Hỏi AI về sản phẩm tại đây</div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setShowChat(true);
                                        setChatHistory(prev => [...prev, { role: 'bot', text: `Chào bạn! Bạn cần tư vấn gì về ${selectedShop.name}?` }]);
                                    }}
                                    style={{
                                        background: 'var(--primary)', color: 'white', border: 'none',
                                        padding: '12px 30px', borderRadius: '6px', fontWeight: '700',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                        boxShadow: '0 4px 12px rgba(78, 56, 45, 0.2)'
                                    }}
                                >
                                    Chat ngay <MessageCircle size={18} />
                                </button>
                            </div>

                            {/* 4. COMMENTS SECTION (Giữ nguyên logic cũ nhưng làm gọn padding) */}
                            <div style={{ padding: '40px', background: '#fff' }}>
                                <h3 style={{ fontFamily: 'Roboto Slab', margin: '0 0 25px', fontSize: '20px', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px', display: 'inline-block' }}>
                                    Đánh giá từ cộng đồng
                                </h3>

                                {user ? <CommentForm shopId={selectedShop.id} onSuccess={() => openDetail(selectedShop.id)} /> :
                                    <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '8px', textAlign: 'center', fontSize: '14px' }}>
                                        <span style={{ color: '#666' }}>Vui lòng </span>
                                        <a onClick={() => setView('login')} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}>đăng nhập</a>
                                        <span style={{ color: '#666' }}> để gửi đánh giá.</span>
                                    </div>
                                }

                                <div style={{ marginTop: '30px' }}>
                                    {shopComments.length === 0 && <p style={{ color: '#999', fontStyle: 'italic' }}>Chưa có đánh giá nào cho địa điểm này.</p>}
                                    {shopComments.map(c => (
                                        <div key={c.id} style={{ display: 'flex', gap: '15px', marginBottom: '25px', borderBottom: '1px solid #f5f5f5', paddingBottom: '25px' }}>
                                            <div style={{ width: '45px', height: '45px', background: '#d4a373', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', flexShrink: 0 }}>
                                                {c.user_name?.[0]?.toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                    <strong style={{ fontSize: '15px', color: '#222' }}>{c.user_name}</strong>
                                                    <small style={{ color: '#999', fontSize: '12px' }}>{c.created_date}</small>
                                                </div>
                                                <div style={{ marginBottom: '8px' }}>
                                                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < (c.rating || 5) ? "#f5a623" : "#e0e0e0"} color="none" />)}
                                                </div>
                                                <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>{c.content}</div>
                                                {c.images && c.images.length > 0 && (
                                                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                                                        {c.images.map((img, idx) => <img key={idx} src={img} alt="review" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee' }} />)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </main>


            {/* --- THÊM ĐOẠN NÀY VÀO: TRANG CHAT FULL MÀN HÌNH --- */}
            {view === 'chat' && (
                <ChatPageUI
                    user={user}
                    onBack={() => setView('home')}
                />
            )}

            {/* --- CHATBOX AI GEMINI --- */}
            {!showChat && (
                <div className="chat-btn" onClick={() => setShowChat(true)}>
                    <MessageCircle size={28} />
                </div>
            )}
            {showChat && (
                <div className="chat-window">
                    <div className="chat-header">
                        <span>Trợ lý SLocal AI</span>
                        <div style={{ cursor: 'pointer' }} onClick={() => setShowChat(false)}><X size={20} /></div>
                    </div>
                    <div className="chat-content">
                        {chatHistory.length === 0 && <div style={{ textAlign: 'center', marginTop: '20px', color: '#999' }}>Chào bạn! Tôi có thể giúp gì về quà lưu niệm?</div>}
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`chat-msg ${msg.role}`}>{msg.text}</div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="chat-input">
                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Nhập câu hỏi..." />
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }} onClick={sendChat}><Send size={18} /></button>
                    </div>
                </div>
            )}





            {/* --- PHẦN ABOUT US & FOOTER (MỚI THÊM) --- */}
            <div className="about-section">
                <div className="container">
                    <div className="about-grid">
                        {/* Cột trái: Câu chuyện */}
                        <div>
                            <h2 className="about-title">About Us</h2>
                            <h3 style={{ fontFamily: 'Roboto Slab', color: '#333', marginTop: 0 }}>
                                Kết nối văn hóa qua từng món quà!
                            </h3>
                            <p className="about-desc">
                                SLocal không chỉ là ứng dụng tìm kiếm cửa hàng thông thường, mà là người bạn đồng hành giúp du khách khám phá những nét đẹp văn hóa tiềm ẩn.
                                Chúng tôi tin rằng mỗi món quà lưu niệm đều mang trong mình một câu chuyện riêng của vùng đất đó.
                                Với sự hỗ trợ của trí tuệ nhân tạo AI tích hợp trong các tính năng, Nhóm 6 mong muốn mang lại trải nghiệm du lịch thông minh và gần gũi nhất đến với người dùng.
                            </p>
                            <div style={{ display: 'flex', gap: '15px' }}>

                            </div>
                        </div>

                        {/* Cột phải: Tính năng nổi bật */}
                        <div className="feature-box-grid">
                            <div className="feature-mini-card">
                                <div style={{ color: 'var(--accent)', marginBottom: '10px' }}><Camera size={32} /></div>
                                <h4 style={{ margin: '5px 0', color: 'var(--primary)' }}>AI Vision</h4>
                                <small style={{ color: '#666' }}>Tìm kiếm bằng hình ảnh</small>
                            </div>
                            <div className="feature-mini-card">
                                <div style={{ color: 'var(--accent)', marginBottom: '10px' }}><MapPin size={32} /></div>
                                <h4 style={{ margin: '5px 0', color: 'var(--primary)' }}>Bản đồ số</h4>
                                <small style={{ color: '#666' }}>Định vị shop gần bạn</small>
                            </div>
                            <div className="feature-mini-card">
                                <div style={{ color: 'var(--accent)', marginBottom: '10px' }}><MessageCircle size={32} /></div>
                                <h4 style={{ margin: '5px 0', color: 'var(--primary)' }}>Trợ lý ảo</h4>
                                <small style={{ color: '#666' }}>Tư vấn 24/7</small>
                            </div>
                            <div className="feature-mini-card">
                                <div style={{ color: 'var(--accent)', marginBottom: '10px' }}><Gift size={32} /></div>
                                <h4 style={{ margin: '5px 0', color: 'var(--primary)' }}>Đổi quà</h4>
                                <small style={{ color: '#666' }}>Tích điểm nhận voucher</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER CREDIT */}
            <div className="footer-credit">
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        © 2025 <b>SLocal Project</b>. All rights reserved.
                    </div>
                    <div>
                        Phát triển bởi <b>Nhóm 6</b>
                    </div>
                </div>
            </div>
            {/* ------------------------------------------ */}

            
        </div>
    );
}

// --- SUB-COMPONENT: CHALLENGE UI ---
// --- SUB-COMPONENT: CHALLENGE UI (UPDATED PRO) ---
function ChallengeUI({ user, onLoginRequest, onBack }) {
    const [activeTab, setActiveTab] = useState('discover'); // 'discover', 'my-quest', 'rewards'
    const [loading, setLoading] = useState(false);

    // Data State
    const [videos, setVideos] = useState([]);
    const [myQuests, setMyQuests] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [userPoints, setUserPoints] = useState(0);
    const [userLocation, setUserLocation] = useState({ lat: null, lon: null });
    const [navigatingQuest, setNavigatingQuest] = useState(null);
    // Lấy vị trí GPS của người dùng
    const getLocation = (callback) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                    setUserLocation(coords);
                    if (callback) callback(coords);
                },
                (err) => {
                    alert("Vui lòng bật GPS để sử dụng tính năng Check-in và tìm kiếm.");
                    console.error(err);
                }
            );
        } else {
            alert("Trình duyệt không hỗ trợ Geolocation.");
        }
    };

    const startNavigation = (quest) => {
        // 1. Lấy vị trí hiện tại mới nhất
        getLocation((coords) => {
            // 2. Lưu quest cần đi vào state để hiển thị bản đồ
            setNavigatingQuest({
                ...quest,
                userLat: coords.lat,
                userLon: coords.lon
            });
        });
    };

    // 1. Initial Load
    useEffect(() => {
        getLocation((coords) => {
            fetchVideos(coords); // Load video ngay khi có toạ độ
        });

        if (user) {
            fetchMyQuests();
            fetchVouchers();
        }
    }, [user]);

    // --- API CALLS ---

    // Lấy danh sách Video (Tab Discover)
    const fetchVideos = async (coords = userLocation) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/challenge/videos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lat: coords.lat,
                    lon: coords.lon,
                    radius: 20 // Lọc trong 20km
                }),
                credentials: 'include'
            });
            const data = await res.json();
            setVideos(data.videos || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    // Lấy danh sách nhiệm vụ của tôi (Tab My Quest)
    const fetchMyQuests = async () => {
        if (!user) return;
        try {
            // Gửi kèm toạ độ để backend tính khoảng cách realtime
            const url = userLocation.lat
                ? `${API_BASE}/api/challenge/current?lat=${userLocation.lat}&lon=${userLocation.lon}`
                : `${API_BASE}/api/challenge/current`;

            const res = await fetch(url, { headers: { 'Authorization': 'Bearer ...' }, credentials: 'include' }); // Nếu có token
            const data = await res.json();
            setMyQuests(data.shops || []);
        } catch (e) { console.error(e); }
    };

    // Lấy Voucher & Điểm (Tab Rewards)
    const fetchVouchers = async () => {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE}/api/challenge/vouchers`, { credentials: 'include'});
            const data = await res.json();
            setVouchers(data.vouchers || []);
            setUserPoints(data.user_points || 0);
        } catch (e) { console.error(e); }
    };

    // --- ACTIONS ---

    // Thêm Shop vào danh sách (Gọi API /add)
    const handleAcceptChallenge = async (shopId) => {
        if (!user) return onLoginRequest();
        if (myQuests.length >= 3) return alert("Bạn chỉ được nhận tối đa 3 thử thách cùng lúc!");

        try {
            const res = await fetch(`${API_BASE}/api/challenge/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shop_id: shopId }),
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok) {
                alert("Đã nhận thử thách! Hãy chuyển sang tab 'Thử thách của tôi' để check-in.");
                fetchMyQuests();
                setActiveTab('my-quest');
            } else {
                alert(data.error);
            }
        } catch (e) { alert("Lỗi kết nối"); }
    };

    // Xóa Shop khỏi danh sách (Gọi API /remove)
    const handleGiveUp = async (shopId) => {
        if (!window.confirm("Bạn có chắc muốn huỷ thử thách này?")) return;
        try {
            const res = await fetch(`${API_BASE}/api/challenge/remove`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shop_id: shopId }),
                credentials: 'include'
            });
            if (res.ok) fetchMyQuests();
        } catch (e) { alert("Lỗi kết nối"); }
    };

    // Check-in GPS (Gọi API /checkin)
    const handleCheckIn = () => {
        getLocation(async (coords) => {
            const fd = new FormData();
            fd.append('user_lat', coords.lat);
            fd.append('user_lon', coords.lon);

            try {
                const res = await fetch(`${API_BASE}/api/challenge/checkin`, {
                    method: 'POST',
                    body: fd,
                    credentials: 'include'
                });
                const data = await res.json();

                if (data.success) {
                    alert(` ${data.message}`);
                    fetchMyQuests(); // Cập nhật lại list (shop đã checkin sẽ biến mất hoặc đổi trạng thái)
                    fetchVouchers(); // Cập nhật điểm
                } else {
                    alert(` ${data.error}`);
                }
            } catch (e) { alert("Lỗi hệ thống Check-in"); }
        });
    };

    // Đổi Voucher (Gọi API /redeem)
    const handleRedeem = async (voucherId) => {
        if (!window.confirm("Bạn muốn dùng điểm để đổi voucher này?")) return;
        try {
            const res = await fetch(`${API_BASE}/api/challenge/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voucher_id: voucherId }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                fetchVouchers(); // Cập nhật lại điểm
            } else {
                alert(data.error);
            }
        } catch (e) { alert("Lỗi đổi quà"); }
    };

    return (
        <div className="fade-in">
            
            {/* HERO HEADER */}
            <div className="hero-header challenge-mode">
                <div className="container">
                    <h1>Du lịch & Săn Quà Địa Phương</h1>
                    <p>Khám phá địa điểm qua video - Check-in nhận điểm - Đổi quà hấp dẫn</p>

                    {user && (
                        <div style={{ marginTop: '20px', display: 'inline-flex', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: '30px', backdropFilter: 'blur(5px)' }}>
                            <Trophy color="#FFD700" size={24} style={{ marginRight: '10px' }} />
                            <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
                                Điểm của bạn: {userPoints}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="container" style={{ marginTop: '30px', minHeight: '600px' }}>
                {/* === THÊM ĐOẠN NÀY VÀO ĐẦU TIÊN === */}
                <div className="container" style={{ marginTop: '20px', marginBottom: '10px' }}>
                    <button className="btn-back" onClick={onBack}>
                        <ChevronRight transform="rotate(180)" size={20} /> Quay lại
                    </button>
                </div>
                {/* TABS NAVIGATION */}
                <div className="challenge-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'discover' ? 'active' : ''}`}
                        onClick={() => setActiveTab('discover')}
                    >
                        <Video size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                        Khám phá
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'my-quest' ? 'active' : ''}`}
                        onClick={() => {
                            if (!user) return onLoginRequest();
                            setActiveTab('my-quest');
                            fetchMyQuests();
                        }}
                    >
                        <MapPin size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                        Nhiệm vụ của tôi ({myQuests.length}/3)
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'rewards' ? 'active' : ''}`}
                        onClick={() => {
                            if (!user) return onLoginRequest();
                            setActiveTab('rewards');
                            fetchVouchers();
                        }}
                    >
                        <Gift size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                        Kho Quà
                    </button>
                </div>

                {/* --- TAB CONTENT: DISCOVER --- */}
                {activeTab === 'discover' && (
                    <div className="fade-in">
                        {loading && <div style={{ textAlign: 'center' }}>Đang tải video quanh bạn...</div>}
                        <div className="video-feed-grid">
                            {videos.map(vid => (
                                <div key={vid.video_id} className="video-card-pro">
                                    {/* Video Frame */}
                                    <iframe
                                        src={vid.embed_url}
                                        className="vc-frame"
                                        title={vid.video_id}
                                        allowFullScreen
                                    ></iframe>

                                    {/* Info Body */}
                                    <div className="vc-info">
                                        <h3 className="vc-shop-name">{vid.shop.name}</h3>
                                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <MapPin size={14} />
                                            {vid.shop.address}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#008234', background: '#e6f6eb', padding: '4px 8px', borderRadius: '4px' }}>
                                                Cách bạn {vid.shop.distance_km} km
                                            </div>
                                            <button
                                                className="btn-booking-primary"
                                                style={{ padding: '8px 16px', fontSize: '13px', width: 'auto' }}
                                                onClick={() => handleAcceptChallenge(vid.shop.id)}
                                                disabled={myQuests.some(q => q.shop_id === vid.shop.id)}
                                            >
                                                {myQuests.some(q => q.shop_id === vid.shop.id) ? 'Đã nhận' : 'Nhận thử thách'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- TAB CONTENT: MY QUESTS (ĐÃ CẬP NHẬT LOGIC MAP) --- */}
                {activeTab === 'my-quest' && (
                    <div className="fade-in">

                        {/* TRƯỜNG HỢP 1: ĐANG XEM BẢN ĐỒ CHỈ ĐƯỜNG */}
                        {navigatingQuest ? (
                            <div className="fade-in">
                                <button
                                    className="btn-back"
                                    onClick={() => setNavigatingQuest(null)}
                                    style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                    <ChevronRight transform="rotate(180)" size={16} /> Quay lại danh sách nhiệm vụ
                                </button>

                                <div className="map-section-pro" style={{ height: '500px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ddd' }}>
                                    <MapContainer
                                        center={[navigatingQuest.lat, navigatingQuest.lon]}
                                        zoom={15}
                                        scrollWheelZoom={true}
                                        style={{ height: "100%", width: "100%" }}
                                    >
                                        <TileLayer attribution='© OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                                        {/* Marker Shop */}
                                        <Marker position={[navigatingQuest.lat, navigatingQuest.lon]}>
                                            <Popup><b>{navigatingQuest.name}</b><br />{navigatingQuest.address}</Popup>
                                        </Marker>

                                        {/* Marker User */}
                                        <Marker position={[navigatingQuest.userLat, navigatingQuest.userLon]}>
                                            <Popup>Vị trí của bạn</Popup>
                                        </Marker>

                                        {/* Vẽ đường đi */}
                                        <RoutingMachine
                                            userLat={navigatingQuest.userLat}
                                            userLon={navigatingQuest.userLon}
                                            shopLat={navigatingQuest.lat}
                                            shopLon={navigatingQuest.lon}
                                        />

                                        {/* Nút về vị trí */}
                                        <RecenterControl lat={navigatingQuest.userLat} lon={navigatingQuest.userLon} />
                                    </MapContainer>
                                </div>

                                <div style={{ marginTop: '20px', padding: '20px', background: '#f0fff4', border: '1px solid #48bb78', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <Navigation size={32} color="#48bb78" />
                                    <div>
                                        <h4 style={{ margin: '0 0 5px', color: '#2f855a' }}>Đang dẫn đường tới: {navigatingQuest.name}</h4>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>Hãy di chuyển đến địa điểm này. Khi đến nơi (cách dưới 500m), hãy quay lại màn hình này và nhấn nút <b>"Check-in tại đây"</b> phía trên.</p>
                                    </div>
                                </div>
                            </div>
                        ) : (

                            /* TRƯỜNG HỢP 2: DANH SÁCH NHIỆM VỤ (LIST VIEW) */
                            <>
                                <div className="progress-header">
                                    <h2 style={{ fontFamily: 'Roboto Slab', color: 'var(--primary)', margin: 0 }}>Tiến độ hành trình</h2>
                                    <p style={{ color: '#666' }}>Hoàn thành check-in tại các địa điểm để nhận điểm thưởng.</p>
                                    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                                        <div className="progress-bar-bg">
                                            <div className="progress-bar-fill" style={{ width: `${(myQuests.length / 3) * 100}%` }}></div>
                                        </div>
                                        <small>{myQuests.length}/3 Thử thách đang kích hoạt</small>
                                    </div>
                                </div>

                                <div className="quest-list">
                                    {myQuests.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#999', border: '2px dashed #eee', borderRadius: '12px' }}>
                                            <MapPin size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
                                            <p>Bạn chưa nhận thử thách nào.</p>
                                            <button className="btn-secondary" onClick={() => setActiveTab('discover')}>Tìm thử thách ngay</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                                <button className="btn-booking-primary" style={{ margin: '0 auto', padding: '15px 40px', fontSize: '18px', boxShadow: '0 4px 15px rgba(78, 56, 45, 0.4)' }} onClick={handleCheckIn}>
                                                    <MapPin size={20} /> CHECK-IN TẠI ĐÂY
                                                </button>
                                            </div>

                                            {myQuests.map((quest) => (
                                                <div key={quest.shop_id} className="quest-card">
                                                    <div className="quest-icon">
                                                        <ShoppingBag size={24} />
                                                    </div>
                                                    <div className="quest-details">
                                                        <h3 style={{ margin: '0 0 5px', fontFamily: 'Roboto Slab', color: 'var(--primary)' }}>{quest.name}</h3>
                                                        <p style={{ margin: '0', fontSize: '14px', color: '#555' }}>{quest.address}</p>
                                                        <div style={{ marginTop: '8px', display: 'flex', gap: '10px', fontSize: '13px' }}>
                                                            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Khoảng cách: {quest.distance_km} km</span>
                                                            <span style={{ color: '#008234' }}>+15 điểm</span>
                                                        </div>
                                                    </div>
                                                    <div className="quest-actions">
                                                        <button className="btn-secondary" style={{ color: '#e53e3e', borderColor: '#e53e3e', fontSize: '13px' }} onClick={() => handleGiveUp(quest.shop_id)}>Huỷ bỏ</button>

                                                        {/* --- NÚT CHỈ ĐƯỜNG ĐÃ SỬA --- */}
                                                        <button
                                                            className="btn-secondary"
                                                            style={{ color: '#007bff', borderColor: '#007bff', fontWeight: 'bold' }}
                                                            onClick={() => startNavigation(quest)}
                                                        >
                                                            <Navigation size={14} style={{ marginRight: '5px' }} /> Chỉ đường
                                                        </button>
                                                        {/* --------------------------- */}
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* --- TAB CONTENT: REWARDS --- */}
                {activeTab === 'rewards' && (
                    <div className="fade-in">
                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <h2 style={{ fontFamily: 'Dancing Script', fontSize: '42px', color: 'var(--accent)' }}>Kho Quà Tặng</h2>
                            <p>Sử dụng điểm tích lũy của bạn để đổi lấy những ưu đãi độc quyền.</p>
                        </div>

                        <div className="reward-grid">
                            {vouchers.map(v => (
                                <div key={v.id} className="voucher-ticket-pro">
                                    <div className="v-left">
                                        <h3 style={{ margin: '0 0 5px', color: 'var(--primary)' }}>{v.code}</h3>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{v.description}</p>
                                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
                                            <CheckCircle size={12} style={{ marginRight: '4px' }} /> Có hiệu lực ngay
                                        </div>
                                    </div>
                                    <div className="v-right">
                                        <div className="point-cost">{v.point_cost}</div>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>Điểm</div>
                                        <button
                                            style={{
                                                background: userPoints >= v.point_cost ? 'var(--primary)' : '#ccc',
                                                color: 'white', border: 'none', padding: '5px 12px',
                                                borderRadius: '4px', cursor: userPoints >= v.point_cost ? 'pointer' : 'not-allowed',
                                                fontSize: '12px', fontWeight: 'bold'
                                            }}
                                            onClick={() => userPoints >= v.point_cost && handleRedeem(v.id)}
                                        >
                                            Đổi ngay
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- SUB-COMPONENT: IMAGE SEARCH ---
// --- SUB-COMPONENT: IMAGE SEARCH (GIAO DIỆN MỚI) ---
function ImageSearchUI({ onBack, onOpenShop }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    // Xử lý khi chọn ảnh
    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
            setPreview(URL.createObjectURL(e.target.files[0]));
            setResult(null); // Reset kết quả cũ
        }
    };

    // Gọi API phân tích
    const handleAnalyze = async () => {
        if (!file) return;
        setLoading(true);
        const fd = new FormData();
        fd.append('image', file);
        try {
            const res = await fetch(`${API_BASE}/api/search-by-image`, { method: 'POST', body: fd, credentials: 'include' });
            const data = await res.json();
            setResult(data);
        } catch { alert('Lỗi xử lý ảnh'); }
        setLoading(false);
    };

    // Hàm reset để tìm ảnh khác
    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
    };

    return (
        <div className="container fade-in" style={{ paddingTop: '30px', paddingBottom: '80px' }}>
            {/* Header: Nút Back & Tiêu đề */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                {/* THÊM style={{ marginBottom: 0, marginRight: '15px' }} ĐỂ CĂN GIỮA */}
                <button className="btn-back" onClick={onBack} style={{ marginBottom: 0, marginRight: '15px' }}>
                    <ChevronRight transform="rotate(180)" size={20} /> Quay lại
                </button>

                <h2 style={{ fontFamily: 'Roboto Slab', fontSize: '28px', color: 'var(--primary)', margin: 0, lineHeight: '1' }}>
                    Tìm kiếm bằng hình ảnh
                </h2>
            </div>

            {/* --- TRẠNG THÁI 1: CHƯA CÓ KẾT QUẢ (Hiển thị khung Upload to) --- */}
            {!result && (
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div
                        className="upload-box-modern"
                        onClick={() => document.getElementById('img-up').click()}
                        style={{ background: 'white', border: '2px dashedvar(--accent)', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {preview ? (
                            <div style={{ position: 'relative', width: '100%', height: '100%', padding: '20px' }}>
                                <img src={preview} style={{ maxHeight: '300px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} alt="Preview" />
                                <div style={{ marginTop: '15px', color: 'var(--text-light)', fontWeight: 'bold' }}>Nhấn để chọn ảnh khác</div>
                            </div>
                        ) : (
                            <div style={{ padding: '40px' }}>
                                <div className="upload-icon-circle" style={{ background: '#fff4e6', color: 'var(--accent)' }}>
                                    <Camera size={40} />
                                </div>
                                <h3 style={{ margin: '15px 0 10px', color: '#333' }}>Tải ảnh món quà bạn muốn tìm</h3>
                                <p style={{ color: '#888', margin: 0 }}>AI sẽ nhận diện và tìm cửa hàng có bán sản phẩm đó.</p>
                            </div>
                        )}
                    </div>

                    <input id="img-up" type="file" hidden accept="image/*" onChange={handleFileChange} />

                    {file && (
                        <button
                            className="btn-booking-primary"
                            style={{ marginTop: '25px', width: '100%', padding: '16px', fontSize: '18px', boxShadow: '0 8px 20px rgba(212, 163, 115, 0.4)' }}
                            onClick={handleAnalyze}
                            disabled={loading}
                        >
                            {loading ? (
                                <span><span className="loader"></span> Đang phân tích...</span>
                            ) : (
                                <span>Tìm kiếm ngay</span>
                            )}
                        </button>
                    )}
                </div>
            )}

            {/* --- TRẠNG THÁI 2: ĐÃ CÓ KẾT QUẢ (Hiển thị Layout kết quả) --- */}
            {result && (
                <div className="fade-in">
                    {/* KHUNG KẾT QUẢ NHẬN DIỆN (HEADER CỦA RESULT) */}
                    <div style={{ background: 'white', borderRadius: '12px', padding: '25px', boxShadow: 'var(--shadow-md)', border: '1px solid #eee', marginBottom: '30px', display: 'flex', gap: '30px', alignItems: 'center', flexWrap: 'wrap' }}>

                        {/* Ảnh gốc user up lên */}
                        <div style={{ width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd', flexShrink: 0 }}>
                            <img src={result.image_url || preview} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>

                        {/* Thông tin nhận diện */}
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 10px', color: '#666', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>
                                <CheckCircle size={14} style={{ marginRight: '5px', verticalAlign: '-2px' }} />
                                Kết quả phân tích
                            </h4>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', fontFamily: 'Roboto Slab' }}>
                                {result.identified_items?.join(', ') || "Không xác định được vật thể"}
                            </div>
                            <p style={{ margin: '5px 0 0', color: '#888', fontSize: '14px' }}>
                                Dưới đây là các cửa hàng có bán sản phẩm tương tự.
                            </p>
                        </div>

                        {/* Nút tìm ảnh khác */}
                        <button className="btn-secondary" onClick={handleReset} style={{ height: 'fit-content' }}>
                            <Camera size={16} style={{ marginRight: '5px' }} /> Tìm ảnh khác
                        </button>
                    </div>

                    {/* DANH SÁCH CỬA HÀNG GỢI Ý (GRID GIỐNG HOME) */}
                    <div>
                        <h3 style={{ fontFamily: 'Roboto Slab', fontSize: '20px', marginBottom: '20px', color: 'var(--primary)', borderLeft: '4px solid var(--accent)', paddingLeft: '15px' }}>
                            Cửa hàng phù hợp nhất ({result.shops?.length || 0})
                        </h3>

                        {result.shops?.length > 0 ? (
                            <div>
                                {result.shops.map(shop => (
                                    <ShopCard
                                        key={shop.id}
                                        shop={{ ...shop, matched_items: result.identified_items?.join(', ') }} // Truyền thêm thông tin match
                                        onClick={() => onOpenShop(shop.id)} // Hàm mở chi tiết shop
                                    />
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '50px', background: '#f9f9f9', borderRadius: '12px' }}>
                                <ShoppingBag size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                                <p style={{ fontSize: '16px', color: '#666' }}>Rất tiếc, chưa tìm thấy cửa hàng nào trong hệ thống có bán sản phẩm này.</p>
                                <button className="btn-secondary" onClick={() => window.location.reload()}>Thử lại với ảnh rõ hơn</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// --- SUB-COMPONENT: AUTH FORM (Cập nhật Register đầy đủ) ---
function AuthForm({ type, onSwitch, onLogin, onRegister, onClose }) {
    const [form, setForm] = useState({
        username: '', password: '',
        name: '', email: '', confirm: '', avatar: null
    });
    const [avatarPreview, setAvatarPreview] = useState(null);

    const handleKeyDown = (e) => { if (e.key === 'Enter') submit(); };

    const submit = () => {
        if (type === 'login') {
            if (!form.username || !form.password) return alert("Vui lòng nhập đủ thông tin");
            onLogin(form.username, form.password);
        } else {
            // Register Logic
            if (!form.username || !form.password || !form.name || !form.email || !form.confirm) return alert("Vui lòng nhập đủ thông tin");
            if (form.password !== form.confirm) return alert("Mật khẩu xác nhận không khớp");

            const fd = new FormData();
            fd.append('name', form.name);
            fd.append('username', form.username);
            fd.append('pass', form.password);
            fd.append('confirm', form.confirm);
            fd.append('email', form.email);
            if (form.avatar) fd.append('avatar', form.avatar);

            onRegister(fd);
        }
    };

    return (
        <div className="auth-overlay">
            <div className="auth-card">
                <div className="auth-close" onClick={onClose}><X size={24} /></div>
                <h2 className="auth-title">{type === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
                <p className="auth-subtitle">{type === 'login' ? 'Chào mừng bạn quay trở lại' : 'Tham gia cộng đồng quà lưu niệm'}</p>

                {type === 'register' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                            <label style={{ cursor: 'pointer' }}>
                                {avatarPreview ? (
                                    <img src={avatarPreview} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} alt="avatar" />
                                ) : (
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                        <Camera size={24} color="#888" />
                                    </div>
                                )}
                                <input type="file" hidden accept="image/*" onChange={e => {
                                    if (e.target.files[0]) {
                                        setForm({ ...form, avatar: e.target.files[0] });
                                        setAvatarPreview(URL.createObjectURL(e.target.files[0]));
                                    }
                                }} />
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Chọn ảnh đại diện</div>
                            </label>
                        </div>
                        <input className="modern-input" placeholder="Họ và tên" onChange={e => setForm({ ...form, name: e.target.value })} />
                        <input className="modern-input" placeholder="Email" type="email" onChange={e => setForm({ ...form, email: e.target.value })} />
                    </>
                )}

                <div style={{ position: 'relative' }}>
                    <UserIcon size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: '#aaa' }} />
                    <input className="modern-input" style={{ paddingLeft: '45px' }} placeholder="Tên đăng nhập" onChange={e => setForm({ ...form, username: e.target.value })} />
                </div>

                <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: '#aaa' }} />
                    <input className="modern-input" style={{ paddingLeft: '45px' }} placeholder="Mật khẩu" type="password" onChange={e => setForm({ ...form, password: e.target.value })} onKeyDown={handleKeyDown} />
                </div>

                {type === 'register' && (
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: '#aaa' }} />
                        <input className="modern-input" style={{ paddingLeft: '45px' }} placeholder="Nhập lại mật khẩu" type="password" onChange={e => setForm({ ...form, confirm: e.target.value })} />
                    </div>
                )}

                <button className="btn-auth-full" onClick={submit}>
                    {type === 'login' ? 'Đăng nhập' : 'Đăng ký ngay'}
                </button>
                {/* THÊM ĐOẠN NÀY VÀO DƯỚI NÚT ĐĂNG NHẬP */}
                {type === 'login' && (
                    <div style={{ textAlign: 'center', marginTop: '15px' }}>
                        <span
                            style={{ color: '#666', fontSize: '13px', cursor: 'pointer' }}
                            onClick={() => { onClose(); onSwitch('forgot-password'); }} // Cần truyền prop onSwitch đặc biệt hoặc xử lý ở cha
                        >
                            Quên mật khẩu?
                        </span>
                    </div>
                )}
                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
                    {type === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }} onClick={onSwitch}>
                        {type === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
                    </span>
                </div>
            </div>
        </div>
    )
}

function CommentForm({ shopId, onSuccess }) {
    const [content, setContent] = useState('');
    const [rating, setRating] = useState(5);
    const [images, setImages] = useState([]);

    const submit = async () => {
        if (!content) return;
        const fd = new FormData();
        fd.append('content', content);
        fd.append('rating', rating);
        if (images.length > 0) {
            for (let i = 0; i < images.length; i++) fd.append('images', images[i]);
        }

        await fetch(`${API_BASE}/api/shops/${shopId}/comments`, { method: 'POST', body: fd, credentials: 'include' });
        setContent(''); setImages([]); onSuccess();
    };

    return (
        <div style={{ background: '#fafafa', padding: '15px', borderRadius: '4px', marginTop: '10px' }}>
            <div style={{ marginBottom: '10px' }}>{[1, 2, 3, 4, 5].map(s => <Star key={s} size={20} fill={s <= rating ? "#d4a373" : "#eee"} color={s <= rating ? "#d4a373" : "#eee"} onClick={() => setRating(s)} style={{ cursor: 'pointer', marginRight: '2px' }} />)}</div>
            <textarea style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '2px' }} rows="3" placeholder="Viết đánh giá của bạn..." value={content} onChange={e => setContent(e.target.value)}></textarea>

            <input type="file" multiple accept="image/*" onChange={e => setImages(e.target.files)} style={{ marginTop: '10px' }} />
            <button className="btn-booking-primary" style={{ marginTop: '10px' }} onClick={submit}>Gửi đánh giá</button>
        </div>
    )
}