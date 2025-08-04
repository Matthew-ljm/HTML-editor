const API_BASE_URL = '/api';

async function apiRequest(endpoint, method = 'GET', data = null, requireAuth = true) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (requireAuth) {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/index.html';
      return;
    }
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = { method, headers };
  if (data) options.body = JSON.stringify(data);
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (!response.ok) throw new Error(result.error || 'Request failed');
    return result;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export const authAPI = {
  login: (data) => apiRequest('/auth/login', 'POST', data, false),
  register: (data) => apiRequest('/auth/register', 'POST', data, false),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
  }
};

export const projectsAPI = {
  create: (data) => apiRequest('/projects/create', 'POST', data),
  list: () => apiRequest('/projects/list'),
  get: (id) => apiRequest(`/projects/${id}`),
  addCollaborator: (projectId, username) => apiRequest('/projects/add-collaborator', 'POST', {
    projectId, username
  })
};

export const filesAPI = {
  create: (data) => apiRequest('/files/create', 'POST', data),
  list: (projectId) => apiRequest(`/files/list?projectId=${projectId}`),
  update: (id, data) => apiRequest(`/files/update?id=${id}`, 'POST', data),
  get: (id) => apiRequest(`/files/get?id=${id}`)
};