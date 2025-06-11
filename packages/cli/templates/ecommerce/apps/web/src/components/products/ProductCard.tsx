import React from 'react';
import type { Product } from '../../stores/productStore';

interface Props {
  product: Product;
  onAddToCart: (id: number) => void;
}

export default function ProductCard({ product, onAddToCart }: Props) {
  return (
    <div className="border rounded p-4">
      <img src={product.image} alt={product.name} className="w-full" />
      <h3 className="mt-2 font-semibold">{product.name}</h3>
      <p>${product.price.toFixed(2)}</p>
      <button onClick={() => onAddToCart(product.id)} className="mt-2 btn">
        Add to Cart
      </button>
    </div>
  );
}
