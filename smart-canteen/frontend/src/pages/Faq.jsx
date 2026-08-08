import React from 'react';

const FAQS = [
  { q: 'How does the pickup slot system work?', a: 'When you place an order, you\'re automatically assigned the earliest pickup slot that still has room. If a slot is full, your order goes to the next one — this spreads out pickups so there\'s no crowd at the counter.' },
  { q: 'What is a digital token?', a: 'Every order gets a short token code (like T-284) and a QR code. Show either at the counter to collect your order — no need to give your name.' },
  { q: 'How do I pay?', a: 'Pay at the counter (cash), from your College Wallet balance, or with the demo UPI option. Wallet payments are real — cash and UPI-demo are recorded but UPI doesn\'t move real money in this version.' },
  { q: 'What are reward points?', a: 'You earn points automatically when an order is marked collected. Redeem them for wallet credit on the Wallet page, or earn 50 bonus points by referring a friend with your referral code.' },
  { q: 'Can I cancel an order?', a: 'Orders can be cancelled by canteen staff before it\'s ready. If you paid by wallet, the amount is refunded automatically.' },
  { q: 'What if my order seems delayed?', a: 'The kitchen dashboard flags orders that are taking longer than expected, so staff can prioritize them. If it\'s been unusually long, ask at the counter with your token.' },
  { q: 'I forgot my password — what now?', a: 'Use "Forgot password" on the login page. You\'ll need your USN/staff ID and the phone number you registered with.' },
];

export default function Faq() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-3xl text-paper mb-4">FAQ & Help</h1>
      <div className="space-y-3">
        {FAQS.map((item, i) => (
          <div key={i} className="card p-4">
            <h3 className="font-body font-semibold text-paper mb-1">{item.q}</h3>
            <p className="text-sm text-paper/60">{item.a}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-paper/40 mt-4">
        Still stuck? Use "Report an issue" from the menu page to reach the canteen team directly.
      </p>
    </div>
  );
}
