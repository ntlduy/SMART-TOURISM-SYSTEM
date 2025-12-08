// JavaScript source code
import axios from "axios";

const SERVER = "http://localhost:5000"; // Địa chỉ Backend Python

export const endpoints = {
    shops: `${SERVER}/api/shops`,
    login: `${SERVER}/api/login`,
    register: `${SERVER}/api/register`,
    current_user: `${SERVER}/api/current-user`,
};

// Cấu hình axios mặc định
export default axios.create({
    baseURL: SERVER
});