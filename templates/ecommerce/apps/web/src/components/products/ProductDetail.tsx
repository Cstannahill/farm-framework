import React from 'react';
import type { Product } from '../../stores/productStore';

interface Props {
  product: Product;
}

export default function ProductDetail({ product }: Props) {
  return (
    <div className="p-4">
      <img src={product.image} alt={product.name} className="w-full" />
      <h2 className="text-2xl font-bold mt-2">{product.name}</h2>
      <p className="mt-2">{product.description}</p>
      <p className="mt-2 font-semibold">${product.price.toFixed(2)}</p>
    </div>
  );
}
