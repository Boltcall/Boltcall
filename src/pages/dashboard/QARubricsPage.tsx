import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FUNCTIONS_BASE } from '../../lib/api';
import { authedFetch } from '../../lib/authedFetch';

interface Agent {
  id: string;
  name: string;
  retell_agent_id: string;
  agent_type?: string;
}

interface RubricCriterion {
  id: string;
  label: string;
  description: string;
  weight: 1 | 2 | 3;
}

interface Rubric {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  criteria: RubricCriterion[];
  is_active: boolean;
  created_at: string;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const WEIGHT_LABELS: Record<number, string> = { 1: 'Low', 2: 'Medium', 3: 'High' };

const QARubricsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRubric, setExpandedRubric] = useState<string | null>(null);

  // Create / edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCriteria, setFormCriteria] = useState<RubricCriterion[]>([]);
  const [saving, setSaving] = useState(false);

  // ── Load agents ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    supabase
      .from('agents')
      .select('id, name, retell_agent_id, agent_type')
      .eq('user_id', user.id)
      .not('retell_agent_id', 'is', null)
      .then(({ data }) => {
        const rows = data || [];
        setAgents(rows);
        if (rows.length > 0) setSelectedAgentId(rows[0].retell_agent_id);
        setLoading(false);
      });
  }, [user]);

  // ── Load rubrics for selected agent ─────────────────────────────────────────

  const fetchRubrics = useCallback(async () => {
    if (!selectedAgentId || !user) return;
    const res = await authedFetch(`${FUNCTIONS_BASE}/qa-rubrics?agent_id=${encodeURIComponent(selectedAgentId)}`);
    if (res.ok) {
      setRubrics(await res.json());
    }
  }, [selectedAgentId, user]);

  useEffect(() => {
    fetchRubrics();
  }, [fetchRubrics]);

  // ── Modal helpers ────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingRubric(null);
    setFormName('');
    setFormDescription('');
    setFormCriteria([{ id: genId(), label: '', description: '', weight: 2 }]);
    setModalOpen(true);
  }

  function openEdit(rubric: Rubric) {
    setEditingRubric(rubric);
    setFormName(rubric.name);
    setFormDescription(rubric.description || '');
    setFormCriteria(rubric.criteria.length > 0 ? rubric.criteria : [{ id: genId(), label: '', description: '', weight: 2 }]);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingRubric(null);
  }

  function addCriterion() {
    setFormCriteria(prev => [...prev, { id: genId(), label: '', description: '', weight: 2 }]);
  }

  function removeCriterion(id: string) {
    setFormCriteria(prev => prev.filter(c => c.id !== id));
  }

  function updateCriterion(id: string, field: keyof RubricCriterion, value: string | number) {
    setFormCriteria(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }

  // ── Save rubric ──────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!formName.trim()) {
      showToast({ message: 'Rubric name is required', variant: 'error' });
      return;
    }
    const validCriteria = formCriteria.filter(c => c.label.trim());
    if (validCriteria.length === 0) {
      showToast({ message: 'Add at least one criterion with a label', variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload = editingRubric
        ? { action: 'update', rubricId: editingRubric.id, name: formName, description: formDescription, criteria: validCriteria }
        : { action: 'create', agentId: selectedAgentId, name: formName, description: formDescription, criteria: validCriteria };

      const res = await authedFetch(`${FUNCTIONS_BASE}/qa-rubrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }

      showToast({ message: editingRubric ? 'Rubric updated' : 'Rubric created', variant: 'success' });
      closeModal();
      fetchRubrics();
    } catch (err: any) {
      showToast({ message: err.message || 'Save failed', variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  // ── Delete rubric ────────────────────────────────────────────────────────────

  async function handleDelete(rubricId: string) {
    const res = await authedFetch(`${FUNCTIONS_BASE}/qa-rubrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', rubricId }),
    });
    if (res.ok) {
      showToast({ message: 'Rubric deleted', variant: 'default' });
      fetchRubrics();
    }
  }

  // ── Toggle active ────────────────────────────────────────────────────────────

  async function toggleActive(rubric: Rubric) {
    await authedFetch(`${FUNCTIONS_BASE}/qa-rubrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', rubricId: rubric.id, is_active: !rubric.is_active }),
    });
    fetchRubrics();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-zinc-700" />
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">QA Rubrics</h1>
            <p className="text-sm text-zinc-500">Define scoring criteria for your agents' conversations</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          disabled={!selectedAgentId}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Rubric
        </button>
      </div>

      {/* Agent selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-zinc-700">Agent:</label>
        <select
          value={selectedAgentId}
          onChange={e => setSelectedAgentId(e.target.value)}
          className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          {agents.map(a => (
            <option key={a.retell_agent_id} value={a.retell_agent_id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Rubric list */}
      {rubrics.length === 0 ? (
        <div className="text-center py-16 bg-zinc-50 rounded-xl border border-zinc-100">
          <ClipboardList className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-600 font-medium">No rubrics yet</p>
          <p className="text-sm text-zinc-400 mt-1">Rubrics let the AI score conversations against your specific business rules</p>
          <button onClick={openCreate} className="mt-4 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
            Create your first rubric
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rubrics.map(rubric => (
            <div key={rubric.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleActive(rubric)}
                    title={rubric.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                    className={`w-4 h-4 rounded-full flex-shrink-0 transition-colors ${rubric.is_active ? 'bg-green-500' : 'bg-zinc-300'}`}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 truncate">{rubric.name}</p>
                    {rubric.description && <p className="text-xs text-zinc-500 truncate">{rubric.description}</p>}
                  </div>
                  <span className="text-xs text-zinc-400 flex-shrink-0">{rubric.criteria.length} criteria</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(rubric)} className="p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(rubric.id)} className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setExpandedRubric(expandedRubric === rubric.id ? null : rubric.id)} className="p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors">
                    {expandedRubric === rubric.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {expandedRubric === rubric.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-zinc-100 overflow-hidden"
                  >
                    <div className="p-4 space-y-2">
                      {rubric.criteria.map(c => (
                        <div key={c.id} className="flex items-start gap-3 text-sm">
                          <CheckCircle className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-zinc-800">{c.label}</span>
                            {c.description && <span className="text-zinc-500 ml-2">— {c.description}</span>}
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${c.weight === 3 ? 'bg-red-100 text-red-700' : c.weight === 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-zinc-100 text-zinc-600'}`}>
                              {WEIGHT_LABELS[c.weight]} weight
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-zinc-100">
                <h2 className="text-lg font-semibold text-zinc-900">{editingRubric ? 'Edit Rubric' : 'New Rubric'}</h2>
                <button onClick={closeModal} className="p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Name *</label>
                  <input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Dental Booking Rubric"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
                  <input
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Optional description"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-zinc-700">Criteria</label>
                    <button onClick={addCriterion} className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add criterion
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formCriteria.map((c, i) => (
                      <div key={c.id} className="border border-zinc-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400 font-medium w-4">{i + 1}.</span>
                          <input
                            value={c.label}
                            onChange={e => updateCriterion(c.id, 'label', e.target.value)}
                            placeholder="Criterion label (e.g. Agent collected patient name)"
                            className="flex-1 border border-zinc-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                          />
                          <select
                            value={c.weight}
                            onChange={e => updateCriterion(c.id, 'weight', Number(e.target.value))}
                            className="border border-zinc-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none"
                          >
                            <option value={1}>Low</option>
                            <option value={2}>Medium</option>
                            <option value={3}>High</option>
                          </select>
                          {formCriteria.length > 1 && (
                            <button onClick={() => removeCriterion(c.id)} className="text-zinc-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <input
                          value={c.description}
                          onChange={e => updateCriterion(c.id, 'description', e.target.value)}
                          placeholder="Description (optional) — helps the AI understand what to look for"
                          className="w-full border border-zinc-100 rounded px-2 py-1.5 text-xs text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-100">
                <button onClick={closeModal} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingRubric ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default QARubricsPage;
