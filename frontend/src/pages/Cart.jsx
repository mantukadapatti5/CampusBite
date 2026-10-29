import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client';
import { queueOrder } from '../utils/offlineQueue';

export default function Cart() {
  const { items, addItem, decreaseItem, removeItem, clearCart, setInstructions, total } = useCart();
  const { user, refreshUser } = useAuth();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const navigate = useNavigate();

  async function applyCoupon() {
    setCouponError('');
    setCouponInfo(null);
    if (!couponCode.trim()) return;
    try {
      const { data } = await api.get('/coupons/validate', {
        params: { code: couponCode.trim(), subtotal: total },
      });
      setCouponInfo(data);
    } catch (err) {
      setCouponError(err.response?.data?.error || 'Could not validate coupon');
    }
  }

  const discount = couponInfo ? Math.round((total * couponInfo.discount_percent) / 100) : 0;
  const finalTotal = total - discount;

  async function placeOrder() {
    setError('');
    setPlacing(true);
    const payload = {
      items: items.map((i) => ({ menu_item_id: i.id, quantity: i.quantity, special_instructions: i.special_instructions || undefined })),
      coupon_code: couponInfo ? couponInfo.code : undefined,
      payment_method: paymentMethod === 'upi' ? 'upi_demo' : paymentMethod === 'wallet' ? 'wallet' : 'cash',
      scheduled_for: scheduleLater && scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
    };

    if (!navigator.onLine) {
      queueOrder(payload);
      clearCart();
      setPlacing(false);
      navigate('/student/orders');
      return;
    }

    try {
      const { data } = await api.post('/orders', payload);
      clearCart();
      if (paymentMethod === 'wallet') await refreshUser();
      navigate(`/student/orders/${data.id}`);
    } catch (err) {
      if (!err.response) {
        // request never reached the server — genuine connectivity failure,
        // not a rejection — so queue it instead of losing the order
        queueOrder(payload);
        clearCart();
        navigate('/student/orders');
        return;
      }
      setError(err.response?.data?.error || 'Could not place order');
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return <p className="text-paper/50 text-center mt-16">Your order is empty. Go add something tasty.</p>;
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-display text-3xl text-paper mb-4">Your order</h1>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-paper font-medium">{item.name}</p>
                <p className="text-xs text-paper/50">₹{item.price} x {item.quantity}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => decreaseItem(item.id)} className="btn-ghost px-2 py-1 text-sm">−</button>
                <span className="font-mono text-signal w-6 text-center">{item.quantity}</span>
                <button onClick={() => addItem(item)} className="btn-ghost px-2 py-1 text-sm">+</button>
                <button onClick={() => removeItem(item.id)} className="text-chili text-xs ml-2">Remove</button>
              </div>
            </div>
            <input
              value={item.special_instructions || ''}
              onChange={(e) => setInstructions(item.id, e.target.value)}
              placeholder="Special instructions (e.g. less spicy, no onion)"
              className="w-full mt-2 bg-panel2 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-paper outline-none focus:border-signal"
            />
          </div>
        ))}
      </div>

      <div className="card p-4 mt-4">
        <label className="block text-xs text-paper/60 mb-1">Coupon code</label>
        <div className="flex gap-2">
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="e.g. WELCOME10"
            className="flex-1 bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal uppercase"
          />
          <button onClick={applyCoupon} className="btn-ghost text-xs px-3">Apply</button>
        </div>
        {couponError && <p className="text-chili text-xs mt-2">{couponError}</p>}
        {couponInfo && (
          <p className="text-leaf text-xs mt-2">
            "{couponInfo.code}" applied — {couponInfo.discount_percent}% off
          </p>
        )}
      </div>

      <div className="card p-4 mt-4">
        <label className="flex items-center gap-2 text-xs text-paper/60">
          <input type="checkbox" checked={scheduleLater} onChange={(e) => setScheduleLater(e.target.checked)} />
          Schedule for later instead of next available slot
        </label>
        {scheduleLater && (
          <input
            type="datetime-local"
            value={scheduledFor}
            min={new Date(Date.now() + 15 * 60000).toISOString().slice(0, 16)}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="w-full mt-2 bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal"
          />
        )}
      </div>

      <div className="card p-4 mt-4">
        <p className="text-xs text-paper/60 mb-2">Payment method</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setPaymentMethod('cash')}
            className={`text-xs py-2 rounded-lg border ${paymentMethod === 'cash' ? 'border-signal text-signal' : 'border-white/10 text-paper/60'}`}
          >
            Pay at counter
          </button>
          <button
            onClick={() => setPaymentMethod('wallet')}
            className={`text-xs py-2 rounded-lg border ${paymentMethod === 'wallet' ? 'border-signal text-signal' : 'border-white/10 text-paper/60'}`}
          >
            Wallet (₹{Number(user?.wallet_balance || 0).toFixed(0)})
          </button>
          <button
            onClick={() => setPaymentMethod('upi')}
            className={`text-xs py-2 rounded-lg border ${paymentMethod === 'upi' ? 'border-signal text-signal' : 'border-white/10 text-paper/60'}`}
          >
            UPI (demo)
          </button>
        </div>
        {paymentMethod === 'wallet' && Number(user?.wallet_balance || 0) < total && (
          <p className="text-[11px] text-chili mt-2">
            Insufficient balance — top up on the Wallet page first.
          </p>
        )}
        {paymentMethod === 'upi' && (
          <p className="text-[11px] text-paper/40 mt-2">
            Demo mode only — simulates a successful payment. A real deployment needs a payment
            gateway (Razorpay/PayU) with your college's merchant account wired in here.
          </p>
        )}
      </div>

      <div className="card p-4 mt-4 space-y-1">
        <div className="flex justify-between text-sm text-paper/60">
          <span>Subtotal</span>
          <span className="font-mono">₹{total.toFixed(0)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-leaf">
            <span>Discount</span>
            <span className="font-mono">−₹{discount.toFixed(0)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-semibold text-paper pt-2 border-t border-white/10 mt-2">
          <span>Total</span>
          <span className="font-mono text-signal">₹{finalTotal.toFixed(0)}</span>
        </div>
      </div>

      {error && <p className="text-chili text-sm mt-3">{error}</p>}

      <button
        onClick={placeOrder}
        disabled={placing || (paymentMethod === 'wallet' && Number(user?.wallet_balance || 0) < finalTotal) || (scheduleLater && !scheduledFor)}
        className="btn-primary w-full mt-4"
      >
        {placing ? 'Placing order…' : 'Place order & get pickup slot'}
      </button>
    </div>
  );
}
