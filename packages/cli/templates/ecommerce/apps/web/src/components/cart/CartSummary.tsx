import React from 'react';
import { useCartStore } from '../../stores/cartStore';

export default function CartSummary() {
  const total = useCartStore(state => state.total);

  return (
    <div className="mt-4 font-semibold">Total: ${total.toFixed(2)}</div>
  );
}
