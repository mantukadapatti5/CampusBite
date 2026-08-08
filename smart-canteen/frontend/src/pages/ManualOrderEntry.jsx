import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function ManualOrderEntry() {
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]); // [{ id, name, price, quantity }]
  const [walkInName, setWalkInName] = useState('');
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/menu').then(({ data }) => setCategories(data));
  }, []);

  function addItem(item) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { id: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  }

  function decreaseItem(id) {
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i)).filter((i) => i.quantity > 0));
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  async function submit() {
    setError('');
    if (cart.length === 0) return setError('Add at least one item');
    if (!walkInName.trim()) return setError("Enter the customer's name");
    setPlacing(true);
    try {
      const { data } = await api.post('/orders/manual', {
        items: cart.map((i) => ({ menu_item_id: i.id, quantity: i.quantity })),
        walk_in_name: walkInName.trim(),
      });
      navigate(`/kitchen/queue`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not place order');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-paper mb-4">Manual Order Entry</h1>
      <p className="text-xs text-paper/50 mb-4">For walk-in customers who don't have an account. Cash only.</p>

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat.id}>
              <h3 className="font-display text-lg text-paper mb-2">{cat.name}</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {(cat.items || []).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    className="card p-2 text-left hover:border-signal/40 flex items-center justify-between"
                  >
                    <span className="text-sm text-paper">{item.name}</span>
                    <span className="font-mono text-xs text-signal">₹{Number(item.price).toFixed(0)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="card p-4 h-fit sticky top-4">
          <h3 className="font-display text-lg text-paper mb-2">Order</h3>
          <input
            value={walkInName}
            onChange={(e) => setWalkInName(e.target.value)}
            placeholder="Customer name"
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal mb-3"
          />

          {cart.length === 0 && <p className="text-xs text-paper/40">Tap items on the left to add.</p>}
          {cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm py-1">
              <span className="text-paper/80">{item.name}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => decreaseItem(item.id)} className="btn-ghost px-1.5 py-0.5 text-xs">−</button>
                <span className="font-mono text-signal w-5 text-center">{item.quantity}</span>
                <button onClick={() => addItem(item)} className="btn-ghost px-1.5 py-0.5 text-xs">+</button>
              </div>
            </div>
          ))}

          <div className="flex justify-between font-semibold text-paper mt-3 pt-2 border-t border-white/10">
            <span>Total</span>
            <span className="font-mono text-signal">₹{total.toFixed(0)}</span>
          </div>

          {error && <p className="text-chili text-xs mt-2">{error}</p>}

          <button onClick={submit} disabled={placing} className="btn-primary text-sm w-full mt-3">
            {placing ? 'Placing…' : 'Place order'}
          </button>
        </div>
      </div>
    </div>
  );
}
