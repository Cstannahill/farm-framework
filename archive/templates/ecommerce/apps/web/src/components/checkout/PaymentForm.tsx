import React from 'react';

export default function PaymentForm() {
  return (
    <form className="mt-4 space-y-2">
      <input type="text" placeholder="Card number" className="input" />
      <input type="text" placeholder="Expiry" className="input" />
      <input type="text" placeholder="CVC" className="input" />
      <button type="submit" className="btn-primary w-full">Pay</button>
    </form>
  );
}
