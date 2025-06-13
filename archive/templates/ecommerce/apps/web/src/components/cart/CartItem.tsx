import React from 'react';
import type { CartItem as Item } from '../../stores/cartStore';

interface Props {
  item: Item;
  remove: (id: number) => void;
}

export default function CartItem({ item, remove }: Props) {
  return (
    <div className="flex items-center justify-between py-2 border-b">
      <span>{item.name}</span>
      <div>
        <span className="mr-2">${item.price.toFixed(2)} x {item.quantity}</span>
        <button onClick={() => remove(item.id)}>Remove</button>
      </div>
    </div>
  );
}
