import React, { useState } from 'react';
import Apis, { endpoints } from '../configs/Apis';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            let res = await Apis.post(endpoints['login'], {
                "username": username,
                "password": password
            });
            if (res.data.success) {
                alert("Đăng nhập thành công!");
                navigate("/"); // Chuyển về trang chủ
            }
        } catch (err) {
            alert(err.response ? err.response.data.error : "Lỗi kết nối server");
        }
    }

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h2 style={{ textAlign: 'center' }}>Đăng nhập</h2>
            <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '15px' }}>
                    <label>Tên đăng nhập:</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>Mật khẩu:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                </div>
                <button type="submit" style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Đăng nhập
                </button>
            </form>
        </div>
    );
}

export default Login;// JavaScript source code
