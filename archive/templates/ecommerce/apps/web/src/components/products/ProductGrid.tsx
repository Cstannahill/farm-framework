import React from 'react';
import { useProductStore } from '../../stores/productStore';
import { useCartStore } from '../../stores/cartStore';
import ProductCard from './ProductCard';

export default function ProductGrid() {
  const products = useProductStore(state => state.products);
  const addToCart = useCartStore(state => state.add);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
      {products.map(p => (
        <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
      ))}
    </div>
  );
}
