import { create } from 'zustand';

export interface Order {
  id: number;
  items: number[];
  total: number;
}

interface State {
  orders: Order[];
  addOrder: (order: Order) => void;
}

export const useOrderStore = create<State>((set) => ({
  orders: [],
  addOrder: (order) => set(state => ({ orders: [...state.orders, order] }))
}));
