import React from 'react';
import PaymentForm from './PaymentForm';
import OrderSummary from './OrderSummary';

export default function CheckoutForm() {
  return (
    <div className="p-4">
      <OrderSummary />
      <PaymentForm />
    </div>
  );
}
