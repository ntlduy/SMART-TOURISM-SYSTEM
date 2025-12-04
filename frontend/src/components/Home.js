import React, { useState, useEffect } from 'react';
import Apis, { endpoints } from '../configs/Apis';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const [shops, setShops] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const loadShops = async () => {
            try {
                let res = await Apis.get(endpoints['shops']);
                // API trả về { data: [...], pagination: ... }
                setShops(res.data.data);
            } catch (err) {
                console.error(err);
            }
        }
        loadShops();
    }, []);

    const goToDetail = (id) => {
        navigate(`/shops/${id}`);
    }

    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ textAlign: 'center' }}>Điểm đến & Mua sắm nổi bật</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                {shops.map(s => (
                    <div key={s.id} className="card" onClick={() => goToDetail(s.id)} style={{ cursor: 'pointer' }}>
                        <img src={s.image} alt={s.name} />
                        <div className="card-body">
                            <h3>{s.name}</h3>
                            <p className="price">{s.price ? s.price.toLocaleString() : 0} VND</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Home;