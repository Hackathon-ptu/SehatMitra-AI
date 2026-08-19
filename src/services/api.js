import axios from 'axios';

// Create Axios instance pointing to the FastAPI backend
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to dynamically inject authorization header if token exists
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

// Modular services
export const authService = {
  async signup(data) {
    const signupData = {
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      phone_number: data.phone_number || null,
      role: data.role || 'patient',
    };
    const response = await apiClient.post('/auth/signup', signupData);
    return response.data;
  },

  async login(data) {
    const params = new URLSearchParams();
    params.append('username', data.email || data.username || '');
    params.append('password', data.password || '');

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

export const healthService = {
  async sendInterviewMessage({ session_id, user_message, language }) {
    const response = await apiClient.post('/health-interview/', {
      session_id: session_id || null,
      user_message,
      language: language || 'hi',
    });
    return response.data;
  },

  async assessRisk(riskPayload) {
    // Backend expected RiskRequest: { session_id: int, symptoms_data: dict }
    const response = await apiClient.post('/risk/', {
      session_id: riskPayload.session_id,
      symptoms_data: riskPayload.symptoms_data,
    });
    return response.data;
  },
};

export const hospitalService = {
  async getNearbyHospitals(lat, lon, risk) {
    const response = await apiClient.get('/hospital/', {
      params: {
        lat,
        lon,
        risk: risk || 'moderate',
      },
    });
    return response.data;
  },
};

export const reportService = {
  async uploadReport(file) {
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

export default apiClient;
