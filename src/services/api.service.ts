import axios from 'axios';
import { cognitoService } from './cognito.service';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Add token
apiClient.interceptors.request.use(
    async (config) => {
        const idToken = cognitoService.getIdToken();
        if (idToken) {
            config.headers.Authorization = `Bearer ${idToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle 401
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshed = await cognitoService.refreshSession();
                if (refreshed) {
                    const idToken = cognitoService.getIdToken();
                    originalRequest.headers.Authorization = `Bearer ${idToken}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // Redirect to login
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;