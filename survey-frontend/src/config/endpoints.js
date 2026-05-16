const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001').replace(/\/$/, '');

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || API_BASE_URL;

export { API_BASE_URL, SOCKET_URL };
