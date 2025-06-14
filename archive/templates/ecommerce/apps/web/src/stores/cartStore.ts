import { create } from 'zustand';
import type { Product } from './productStore';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface State {
  items: CartItem[];
  add: (product: Product) => void;
  remove: (id: number) => void;
  total: number;
}

export const useCartStore = create<State>((set, get) => ({
  items: [],
  add: (product) => {
    set(state => {
      const existing = state.items.find(i => i.id === product.id);
      if (existing) {
        existing.quantity += 1;
        return { items: [...state.items] };
      }
      return { items: [...state.items, { id: product.id, name: product.name, price: product.price, quantity: 1 }] };
    });
  },
  remove: (id) => set(state => ({ items: state.items.filter(i => i.id !== id) })),
  total: 0
}));

useCartStore.subscribe(state => {
  state.total = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
});
