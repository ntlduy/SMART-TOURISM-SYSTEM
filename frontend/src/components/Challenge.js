import React, { useState, useEffect } from 'react';

const API_BASE = 'http://127.0.0.1:5000';

export default function Challenge({ user }) {
  // TikTok links are stored in the database now; no need for manual input
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [videos, setVideos] = useState([]);
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [skipReceipt, setSkipReceipt] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Try to obtain geolocation when component mounts
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
      }, () => {});
    }
  }, []);

  const startChallenge = async () => {
    if (!user) return alert('Bạn cần đăng nhập để bắt đầu challenge');
    if (!window.confirm('Bạn có muốn tiếp nhận thử thách này không?')) return;

    const payload = {
      lat: parseFloat(lat) || null,
      lon: parseFloat(lon) || null,
      radius_km: 5
    };

    const res = await fetch(`${API_BASE}/api/challenge/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), credentials: 'include'
    });
    const data = await res.json();
    setVideos(data.videos || []);
    setShops(data.nearby_shops || []);
  };

  const handleComplete = async () => {
    if (!selectedShop) return alert('Chọn địa điểm đã đến');

    const form = new FormData();
    form.append('shop_id', selectedShop.id);
    form.append('user_lat', lat);
    form.append('user_lon', lon);
    // If a receipt file is provided and user wants to upload, append it.
    if (!skipReceipt && receiptFile) {
      form.append('receipt', receiptFile);
    }

    // Upload and complete
    const res = await fetch(`${API_BASE}/api/challenge/complete`, {
      method: 'POST', body: form, credentials: 'include'
    });
    const data = await res.json();
    if (data.success) {
      setMessage(`Thành công! Điểm hiện tại: ${data.new_points}`);
    } else {
      setMessage('Lỗi: ' + (data.error || 'Không xác định'));
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Challenge - Thử thách tại điểm</h2>

      {/* TikTok links are now loaded from the server-side library; no manual input required */}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="lat" value={lat} onChange={e=>setLat(e.target.value)} />
        <input placeholder="lon" value={lon} onChange={e=>setLon(e.target.value)} />
        <button onClick={startChallenge}>Bắt đầu thử thách</button>
      </div>

      <div>
        <h3>Video được phát hiện</h3>
        {videos.map(v => (
          <div key={v.id} style={{ marginBottom: 12 }}>
            <div>Original: <a href={v.original} target="_blank" rel="noreferrer">{v.original}</a></div>
            {/* Simple embed using iframe; some TikTok URLs may not allow embedding due to cross-origin policy. */}
            <iframe title={v.id} src={v.embed} width="320" height="500" style={{ border: 'none' }} />
          </div>
        ))}
      </div>

      <div>
        <h3>Địa điểm gần bạn</h3>
        {shops.map(s => (
          <div key={s.id} style={{ border: '1px solid #eee', padding: 8, marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>{s.name}</div>
            <div style={{ color: '#777' }}>{s.address}</div>
            <div style={{ marginTop: 6 }}>
              <button onClick={()=>setSelectedShop(s)}>Chọn địa điểm này</button>
            </div>
          </div>
        ))}
      </div>

      {selectedShop && (
        <div style={{ marginTop: 16 }}>
          <h4>Hoàn thành thử thách tại: {selectedShop.name}</h4>
          <div>
            <input type="file" accept="image/*" onChange={e=>setReceiptFile(e.target.files[0])} />
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={skipReceipt} onChange={e=>setSkipReceipt(e.target.checked)} />
                <span>Hoàn thành chỉ bằng vị trí (không cần hoá đơn)</span>
              </label>
              <button onClick={handleComplete}>Hoàn thành</button>
            </div>
          </div>
        </div>
      )}

      {message && <div style={{ marginTop: 12, color: 'green' }}>{message}</div>}
    </div>
  );
}
