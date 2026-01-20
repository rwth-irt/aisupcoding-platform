import axios from 'axios';

// Create a pre-configured instance of axios
const api = axios.create({
  baseURL: 'http://kisupcoding.irt.rwth-aachen.de:5001/api' // Your backend's base URL
});

// Add an "interceptor" to run on every request
api.interceptors.request.use(
  (config) => {
    // Get the token from local storage
    const token = localStorage.getItem('token');
    if (token) {
      // If the token exists, add it to the Authorization header
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config; // Continue with the request
  },
  (error) => {
    // Handle request error
    return Promise.reject(error);
  }
);

export default api;