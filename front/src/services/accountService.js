import api from './api'

export const accountService = {
  list: () => api.get('/accounts').then(r => r.data),
  getById: (id) => api.get(`/accounts/${id}`).then(r => r.data),
  create: (data) => api.post('/accounts', data).then(r => r.data),
  update: (id, data) => api.put(`/accounts/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/accounts/${id}`),
}
