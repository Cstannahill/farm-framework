import React from 'react';
import { useCartStore } from '../../stores/cartStore';

export default function OrderSummary() {
  const { items, total } = useCartStore();

  return (
    <div>
      <h3 className="font-semibold mb-2">Order Summary</h3>
      <ul>
        {items.map(i => (
          <li key={i.id}>{i.name} x {i.quantity}</li>
        ))}
      </ul>
      <div className="mt-2">Total: ${total.toFixed(2)}</div>
    </div>
  );
}
