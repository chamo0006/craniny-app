const payload = {
  nombre: 'Producto prueba desde script',
  descripcion: 'Prueba automática',
  precio: 9.99,
  categoria: 'Test',
  variants: [{ talle: 'M', color: 'Negro', stock: 5 }]
}

fetch('http://localhost:3000/api/admin/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
  .then(async (res) => {
    const body = await res.json().catch(() => null)
    console.log('STATUS', res.status)
    console.log('BODY', body)
  })
  .catch((err) => {
    console.error('ERROR', err.message)
  })
