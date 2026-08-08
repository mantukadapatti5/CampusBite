import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import QueueStatus from '../components/QueueStatus.jsx';
import CrowdPrediction from '../components/CrowdPrediction.jsx';
import VoiceOrder from '../components/VoiceOrder.jsx';
import AnnouncementBanner from '../components/AnnouncementBanner.jsx';

function timeOfDayRecommendation() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return { slug: 'breakfast', note: 'Good morning — breakfast is fresh right now.' };
  if (hour >= 11 && hour < 15) return { slug: 'lunch', note: 'Lunch hour — beat the rush and order ahead.' };
  if (hour >= 15 && hour < 18) return { slug: 'snacks', note: 'Evening snack time — tea and something crispy?' };
  if (hour >= 18 || hour < 6) return { slug: 'night', note: 'Dinner menu is live now.' };
  return null;
}

export default function Menu() {
  const [categories, setCategories] = useState([]);
  const [activeSlug, setActiveSlug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const [search, setSearch] = useState('');
  const [vegFilter, setVegFilter] = useState('all'); // all | veg | nonveg
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortPopularity, setSortPopularity] = useState(false);

  const { addItem, items } = useCart();
  const { user } = useAuth();
  const recommendation = timeOfDayRecommendation();

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (vegFilter === 'veg') params.veg = 'true';
    if (vegFilter === 'nonveg') params.veg = 'false';
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (sortPopularity) params.sort = 'popularity';

    const debounce = setTimeout(() => {
      api.get('/menu', { params }).then(({ data }) => {
        setCategories(data);
        if (data.length && !data.find((c) => c.slug === activeSlug)) setActiveSlug(data[0].slug);
        setLoading(false);
      });
    }, search ? 300 : 0);

    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, vegFilter, minPrice, maxPrice, sortPopularity]);

  useEffect(() => {
    if (user) {
      api.get('/favorites').then(({ data }) => {
        setFavoriteIds(new Set(data.map((i) => i.id)));
      });
    }
  }, [user]);

  async function toggleFavorite(itemId) {
    if (!user) return;
    const { data } = await api.post('/favorites/toggle', { menu_item_id: itemId });
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (data.favorited) next.add(itemId); else next.delete(itemId);
      return next;
    });
  }

  const activeCategory = categories.find((c) => c.slug === activeSlug);

  function quantityInCart(itemId) {
    const found = items.find((i) => i.id === itemId);
    return found ? found.quantity : 0;
  }

  const allItems = categories.flatMap((c) => c.items || []);
  function handleVoiceResult(transcript) {
    const lower = transcript.toLowerCase();
    const match = allItems.find((item) => lower.includes(item.name.toLowerCase()));
    if (match) addItem(match);
    return match;
  }

  const displayedItems = showFavoritesOnly
    ? (activeCategory?.items || []).filter((i) => favoriteIds.has(i.id))
    : activeCategory?.items || [];

  return (
    <div className="grid md:grid-cols-[1fr_280px] gap-6">
      <div>
        <AnnouncementBanner />
        {recommendation && (
          <button
            onClick={() => setActiveSlug(recommendation.slug)}
            className="w-full text-left card p-3 mb-4 border-signal/30 hover:border-signal/60 transition"
          >
            <span className="text-xs font-mono text-signal">SUGGESTED NOW</span>
            <p className="text-sm text-paper/80 mt-0.5">{recommendation.note}</p>
          </button>
        )}

        <div className="card p-3 mb-4 space-y-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search food…"
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal"
          />
          <div className="flex flex-wrap gap-2 items-center">
            <select value={vegFilter} onChange={(e) => setVegFilter(e.target.value)}
              className="bg-panel2 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-paper outline-none focus:border-signal">
              <option value="all">Veg + Non-veg</option>
              <option value="veg">Veg only</option>
              <option value="nonveg">Non-veg only</option>
            </select>
            <input type="number" placeholder="Min ₹" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
              className="w-20 bg-panel2 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-paper outline-none focus:border-signal" />
            <input type="number" placeholder="Max ₹" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
              className="w-20 bg-panel2 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-paper outline-none focus:border-signal" />
            <label className="flex items-center gap-1 text-xs text-paper/60">
              <input type="checkbox" checked={sortPopularity} onChange={(e) => setSortPopularity(e.target.checked)} />
              Sort by popularity
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c.slug}
                onClick={() => setActiveSlug(c.slug)}
                className={`whitespace-nowrap px-4 py-2 rounded-t-lg font-display text-lg tracking-wide transition ${
                  activeSlug === c.slug
                    ? 'bg-panel text-signal border-b-2 border-signal'
                    : 'text-paper/50 hover:text-paper'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <VoiceOrder onResult={handleVoiceResult} />
        </div>

        {user && (
          <label className="flex items-center gap-2 text-xs text-paper/60 mb-3">
            <input type="checkbox" checked={showFavoritesOnly} onChange={(e) => setShowFavoritesOnly(e.target.checked)} />
            Show favorites only
          </label>
        )}

        {loading ? (
          <p className="text-paper/50 text-sm">Loading…</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {displayedItems.map((item) => (
              <div key={item.id} className="card p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-body font-semibold text-paper">{item.name}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`mt-1 w-2.5 h-2.5 rounded-full ${item.is_veg ? 'bg-leaf' : 'bg-chili'}`}
                        title={item.is_veg ? 'Veg' : 'Non-veg'}
                      />
                      {user && (
                        <button onClick={() => toggleFavorite(item.id)} className="text-lg leading-none">
                          <span className={favoriteIds.has(item.id) ? 'text-signal' : 'text-panel2'}>★</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-paper/50 mt-1">{item.description}</p>
                  {item.stock_quantity != null && item.stock_quantity <= 10 && (
                    <p className="text-xs text-chili mt-1">Only {item.stock_quantity} left</p>
                  )}
                  {(item.ingredients || item.calories || item.allergens) && (
                    <button
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="text-[11px] text-signal/80 mt-1"
                    >
                      {expandedId === item.id ? 'Hide details' : 'Ingredients & nutrition'}
                    </button>
                  )}
                  {expandedId === item.id && (
                    <div className="text-[11px] text-paper/50 mt-1 space-y-0.5">
                      {item.ingredients && <p>Ingredients: {item.ingredients}</p>}
                      {item.calories && <p>Calories: {item.calories} kcal</p>}
                      {item.allergens && item.allergens !== 'none' && <p className="text-chili">Allergens: {item.allergens}</p>}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-mono text-signal">₹{Number(item.price).toFixed(0)}</span>
                  <button
                    onClick={() => addItem(item)}
                    className="btn-primary text-xs py-1.5"
                  >
                    {quantityInCart(item.id) > 0 ? `Add another (${quantityInCart(item.id)})` : 'Add to order'}
                  </button>
                </div>
              </div>
            ))}
            {displayedItems.length === 0 && (
              <p className="text-paper/40 text-sm">
                {showFavoritesOnly ? "You haven't favorited anything in this category yet." : 'Nothing matches — try a different search or filter.'}
              </p>
            )}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <QueueStatus />
        <CrowdPrediction />
      </aside>
    </div>
  );
}
