import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Trash2, DollarSign } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { PopButton } from '../../../components/ui/pop-button';

interface ServiceRow {
  id?: string;
  name: string;
  price: string; // dollars, as typed
  duration: string; // minutes, as typed
}

const centsToDollarStr = (cents: number | null): string =>
  cents == null ? '' : String(cents / 100);

const dollarStrToCents = (s: string): number | null => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

const ServicesPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [avgDealValue, setAvgDealValue] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const [{ data: services }, { data: profile }] = await Promise.all([
          supabase
            .from('services')
            .select('id, name, price_cents, duration_min')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('business_profiles')
            .select('id, workspace_id, avg_deal_value_cents')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);

        setRows(
          (services || []).map((s) => ({
            id: s.id,
            name: s.name || '',
            price: centsToDollarStr(s.price_cents),
            duration: s.duration_min != null ? String(s.duration_min) : '',
          }))
        );
        if (profile) {
          setProfileId(profile.id);
          setWorkspaceId(profile.workspace_id);
          setAvgDealValue(centsToDollarStr(profile.avg_deal_value_cents));
        }
      } catch (err) {
        console.error('Error loading services:', err);
        showToast({ title: 'Error', message: 'Could not load services', variant: 'error', duration: 4000 });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const updateRow = (i: number, patch: Partial<ServiceRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, { name: '', price: '', duration: '' }]);

  const deleteRow = async (i: number) => {
    const row = rows[i];
    if (row.id) {
      const { error } = await supabase.from('services').delete().eq('id', row.id);
      if (error) {
        showToast({ title: 'Error', message: 'Could not delete service', variant: 'error', duration: 4000 });
        return;
      }
    }
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const named = rows.filter((r) => r.name.trim());

      for (const row of named) {
        const record = {
          name: row.name.trim(),
          price_cents: dollarStrToCents(row.price),
          duration_min: row.duration ? parseInt(row.duration, 10) || null : null,
        };
        if (row.id) {
          const { error } = await supabase.from('services').update(record).eq('id', row.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('services')
            .insert({ ...record, user_id: user.id, workspace_id: workspaceId })
            .select('id')
            .single();
          if (error) throw error;
          row.id = data.id;
        }
      }

      if (profileId) {
        const { error } = await supabase
          .from('business_profiles')
          .update({ avg_deal_value_cents: dollarStrToCents(avgDealValue) })
          .eq('id', profileId);
        if (error) throw error;
      }

      setRows([...rows]);
      showToast({ title: 'Saved', message: 'Services and pricing saved', variant: 'success', duration: 3000 });
    } catch (err) {
      console.error('Error saving services:', err);
      showToast({ title: 'Error', message: 'Could not save services', variant: 'error', duration: 4000 });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading services…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Services catalog */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Wrench className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Services & Pricing</h2>
            <p className="text-sm text-gray-500">
              Prices here power your booked-revenue dashboard — each booking is valued by its matching service.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {rows.length === 0 && (
            <p className="text-sm text-gray-500">
              No services yet. Add the jobs you offer with typical prices so bookings show real dollar value.
            </p>
          )}
          {rows.map((row, i) => (
            <div key={row.id || `new-${i}`} className="flex items-center gap-3">
              <input
                type="text"
                value={row.name}
                onChange={(e) => updateRow(i, { name: e.target.value })}
                placeholder="Service name (e.g. Drain cleaning)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={row.price}
                  onChange={(e) => updateRow(i, { price: e.target.value })}
                  placeholder="Price"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="relative w-32">
                <input
                  type="number"
                  min="0"
                  value={row.duration}
                  onChange={(e) => updateRow(i, { duration: e.target.value })}
                  placeholder="Minutes"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <button
                onClick={() => deleteRow(i)}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete service"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            onClick={addRow}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add service
          </button>
        </div>
      </div>

      {/* Average job value fallback */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-green-100 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Average Job Value</h2>
            <p className="text-sm text-gray-500">
              Used when a booking doesn't match any service above.
            </p>
          </div>
        </div>
        <div className="relative w-40 mt-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            min="0"
            value={avgDealValue}
            onChange={(e) => setAvgDealValue(e.target.value)}
            placeholder="0"
            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      <PopButton color="blue" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </PopButton>
    </div>
  );
};

export default ServicesPage;
