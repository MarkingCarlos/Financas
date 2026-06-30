import api from './api'

export const billService = {
  listForCard: (cardId) => api.get(`/bills/card/${cardId}`).then(r => r.data),
  close: (id) => api.post(`/bills/${id}/close`).then(r => r.data),
  pay: (id, data) => api.post(`/bills/${id}/pay`, data).then(r => r.data),
}
