import api from './api'

export const wishItemService = {
  list: () => api.get('/wish-items').then(r => r.data),
  create: (data) => api.post('/wish-items', data).then(r => r.data),
  giveUp: (id) => api.patch(`/wish-items/${id}/give-up`).then(r => r.data),
  reactivate: (id) => api.patch(`/wish-items/${id}/reactivate`).then(r => r.data),
  // Vincula a transação da compra; se o contador não zerou, o backend pune os outros contadores
  purchase: (id, transactionId) => api.patch(`/wish-items/${id}/purchase`, { transactionId }).then(r => r.data),
  remove: (id) => api.delete(`/wish-items/${id}`),
}
