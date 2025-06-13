import React from 'react';
import { useCartStore } from '../../stores/cartStore';
import CartItem from './CartItem';
import CartSummary from './CartSummary';

export default function CartSidebar() {
  const { items, remove } = useCartStore();

  return (
    <aside className="w-64 p-4 border-r fixed h-full bg-white">
      <h2 className="text-lg font-bold mb-4">Cart</h2>
      {items.map(item => (
        <CartItem key={item.id} item={item} remove={remove} />
      ))}
      <CartSummary />
    </aside>
  );
}
