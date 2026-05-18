export default function CurrencyInput({ value, onChange, className, required, placeholder }) {
  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '')
    if (!digits) { onChange(''); return }
    onChange((parseInt(digits, 10) / 100).toFixed(2))
  }

  const display = value
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)
    : ''

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      required={required}
      placeholder={placeholder ?? 'R$ 0,00'}
      value={display}
      onChange={handleChange}
    />
  )
}
