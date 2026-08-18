import axios from 'axios';

// Get base URL from env
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

// Create Axios Instance
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Setup Auth Interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authApi = {
  async signup(data: any) {
    const signupData = {
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      phone_number: data.phone_number || null,
      role: data.role || "patient",
    };
    const response = await apiClient.post('/auth/signup', signupData);
    return response.data;
  },

  async login(formData: Record<string, string>) {
    // Backend uses OAuth2PasswordRequestForm or JSON login
    // Ensure request is sent as application/x-www-form-urlencoded with username (mapped from email) and password
    const params = new URLSearchParams();
    params.append('username', formData.email || formData.username || '');
    params.append('password', formData.password || '');

    const response = await apiClient.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.data?.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
  },
};

// Chat API endpoints
export const chatApi = {
  async sendMessage(message: string, language: string = 'en', sessionId?: number) {
    const response = await apiClient.post('/chat/', {
      message,
      language,
      session_id: sessionId || null,
    });
    return response.data;
  },
};

// Health Interview API endpoints
export const interviewApi = {
  async sendAnswer(userMessage: string, language: string = 'en', sessionId?: number) {
    const response = await apiClient.post('/health-interview/', {
      user_message: userMessage,
      language,
      session_id: sessionId || null,
    });
    return response.data;
  },
};

// Risk Assessment API endpoints
export const riskApi = {
  async assessRisk(sessionId: number, symptomsData: Record<string, any>) {
    const response = await apiClient.post('/risk/', {
      session_id: sessionId,
      symptoms_data: symptomsData,
    });
    return response.data;
  },
};

// Nearby Hospital API endpoints
export const hospitalApi = {
  async getNearby(lat: number, lon: number, risk: string = 'moderate') {
    const response = await apiClient.get('/hospital/', {
      params: {
        lat,
        lon,
        risk,
      },
    });
    return response.data;
  },
};

// Medical Report API endpoints
export const reportApi = {
  async uploadReport(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/report/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
