import axios from 'axios';

// Постійний хмарний домен
export const BASE_URL = 'https://jocosely-telekinetic-eleonore.ngrok-free.dev';

export const apiClient = axios.create({
    baseURL: BASE_URL,
});