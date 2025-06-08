import { create } from 'zustand';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
}

interface State {
  products: Product[];
}

export const useProductStore = create<State>(() => ({
  products: []
}));
