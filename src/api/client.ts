import axios, { AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSessionStore, SESSION_KEY, SESSION_EXPIRES_KEY } from '@/store/useSessionStore';

// const BASE_URL = 'https://api.albbano.org';
const BASE_URL = 'http://localhost:8000';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = useSessionStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !config._retry) {
      config._retry = true;

      // 순환 참조 방지를 위해 axios 직접 호출
      const { data } = await axios.post<{ token: string; expires_at: string }>(
        `${BASE_URL}/api/v1/session`
      );
      await AsyncStorage.setItem(SESSION_KEY, data.token);
      await AsyncStorage.setItem(SESSION_EXPIRES_KEY, data.expires_at);
      useSessionStore.getState().setSession(data.token, data.expires_at);

      config.headers = { ...config.headers, Authorization: `Bearer ${data.token}` };
      return client(config);
    }

    return Promise.reject(error);
  }
);

export default client;
