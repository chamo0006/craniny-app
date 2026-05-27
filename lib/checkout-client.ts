export type CheckoutItem = {
  id: number
  selectedSize?: string
  selectedColor?: string
  quantity: number
}

export async function submitCheckout(items: CheckoutItem[]): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  })
  return res.json()
}
