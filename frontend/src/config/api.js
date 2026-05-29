const API_BASE_URL = process.env.REACT_APP_API_URL;

export const API = {
  simulate: `${API_BASE_URL}/simulate`,
  health: `${API_BASE_URL}/health`,
};
