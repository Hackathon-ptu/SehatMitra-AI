import axios from 'axios';

// Create Axios instance pointing to the FastAPI backend
export const apiClient = axios.create({
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
  async sendOTP(email, phone) {
    const response = await apiClient.post('/auth/send-otp', { email, phone });
    return response.data;
  },

  async verifyAndRegister(data) {
    const response = await apiClient.post('/auth/verify-and-register', {
      email: data.email,
      otp_code: data.otp_code,
      password: data.password,
      full_name: data.full_name,
      phone: data.phone,
      username: data.username,
    });
    if (response.data?.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

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
    params.append('username', data.identifier || data.email || data.username || '');
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

  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  async updateProfile(profileData) {
    const response = await apiClient.post('/auth/profile', profileData);
    return response.data;
  },

  async suggestUsernames(baseName, email) {
    const response = await apiClient.get('/auth/suggest-usernames', {
      params: { base_name: baseName, email }
    });
    return response.data;
  },

  async forgotPassword(identifier) {
    const response = await apiClient.post('/auth/forgot-password', { identifier });
    return response.data;
  },

  async resetPassword(email, otp_code, new_password) {
    const response = await apiClient.post('/auth/reset-password', { email, otp_code, new_password });
    return response.data;
  },

  async verifyPassword(password) {
    const response = await apiClient.post('/auth/verify-password', { password });
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
  },
};

export const healthService = {
  async sendInterviewMessage({ session_id, user_message, language, language_code, language_name, language_native_name }) {
    const response = await apiClient.post('/health-interview/', {
      session_id: session_id || null,
      user_message,
      language: language || 'hi',
      language_code,
      language_name,
      language_native_name
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

  async getTriageChatResponse(payload) {
    const response = await apiClient.post('/triage/', payload);
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
  async uploadReport(file, language) {
    const activeLang = language || localStorage.getItem('preferred_lang') || localStorage.getItem('language') || 'hi-IN';
    const langCode = activeLang.split('-')[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', langCode);

    const response = await apiClient.post(`/reports/analyze`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const historyService = {
  async getConsultations() {
    const response = await apiClient.get('/history/consultations');
    return response.data;
  },
  async getReports() {
    const response = await apiClient.get('/history/reports');
    return response.data;
  },
};

export const bhashiniService = {
  async transcribeAudio(audioBase64, languageCode) {
    const response = await apiClient.post('/bhashini/asr', {
      audio_base64: audioBase64,
      language_code: languageCode,
    });
    return response.data;
  },
  async synthesizeSpeech(text, languageCode, gender = 'female') {
    const response = await apiClient.post('/bhashini/tts', {
      text,
      language_code: languageCode,
      gender,
    });
    return response.data;
  },
};

export default apiClient;
