import api from './api'

export const establishmentService = {
  list: () => api.get('/establishments').then(r => r.data),
  create: (data) => api.post('/establishments', data).then(r => r.data),
  update: (id, data) => api.put(`/establishments/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/establishments/${id}`),
}
