/**
 * BusinessBriefEditor — confidence-highlighted Business Brief on /client/agent.
 *
 * Renders a flat list of brief fields extracted from the intake call.
 *   - Fields with extraction confidence < 0.80 get an amber ring and a
 *     "We're not sure about this — confirm?" tooltip.
 *   - Click any field to edit inline. On save we POST to
 *     /api/agency-client-update-kb which inserts a new agency_knowledge row
 *     (versioned) AND queues a prompt_revision artifact.
 *
 * This component is intentionally pure presentation + a single save callback —
 * the parent owns the brief data and refetches after each save so the version
 * number stays current.
 */

import React, { useState } from 'react';
import { AlertCircle, Loader2, Pencil, Save, X } from 'lucide-react';

import { cn } from '../../lib/utils';

export type BriefKind = 'service' | 'faq' | 'policy' | 'case_study' | 'call_pattern';

export interface BriefField {
  /** Stable ID — usually the agency_knowledge.id of the most recent row for this field. */
  id: string;
  /** Display label, e.g. "Services offered", "Average ticket size". */
  label: string;
  /** The current value as the client (and the agent) sees it. */
  value: string;
  /** Optional explanatory help text shown under the field while editing. */
  help?: string;
  /** Knowledge kind — controls which agency_knowledge row family this lands in. */
  kind: BriefKind;
  /**
   * Dot-path the architect uses to know which subtree of the KB content this
   * field maps to (e.g. "services.toxin.price_ranges").
   */
  field_path: string;
  /** Extraction confidence 0-1; <0.80 highlights amber. */
  confidence: number;
}

export interface SaveBriefFieldInput {
  kind: BriefKind;
  field_path: string;
  field_label: string;
  content_patch: Record<string, unknown>;
}

export interface SaveResult {
  ok: boolean;
  message?: string;
}

interface BusinessBriefEditorProps {
  fields: BriefField[];
  onSaveField: (input: SaveBriefFieldInput) => Promise<SaveResult>;
  className?: string;
  /**
   * Optional callout shown above the list — used to surface "your last edit
   * is queued for retraining" status from the parent.
   */
  notice?: React.ReactNode;
}

const LOW_CONFIDENCE_THRESHOLD = 0.8;

const BusinessBriefEditor: React.FC<BusinessBriefEditorProps> = ({
  fields,
  onSaveField,
  className,
  notice,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState<string>('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorByField, setErrorByField] = useState<Record<string, string>>({});

  const startEdit = (field: BriefField) => {
    setEditingId(field.id);
    setDraftValue(field.value || '');
    setErrorByField((prev) => ({ ...prev, [field.id]: '' }));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftValue('');
  };

  const handleSave = async (field: BriefField) => {
    setSavingId(field.id);
    setErrorByField((prev) => ({ ...prev, [field.id]: '' }));
    try {
      // Build the patch — we hand the architect a minimal JSON object keyed
      // on the leaf field name. The architect walks field_path to merge it.
      const leafKey = field.field_path.split('.').slice(-1)[0] || 'value';
      const patch: Record<string, unknown> = { [leafKey]: draftValue };
      const result = await onSaveField({
        kind: field.kind,
        field_path: field.field_path,
        field_label: field.label,
        content_patch: patch,
      });
      if (!result.ok) {
        setErrorByField((prev) => ({ ...prev, [field.id]: result.message || 'Save failed' }));
      } else {
        setEditingId(null);
      }
    } catch (err) {
      setErrorByField((prev) => ({
        ...prev,
        [field.id]: err instanceof Error ? err.message : 'Save failed',
      }));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className={cn('rounded-2xl border border-zinc-200 bg-white shadow-sm', className)}>
      <div className="border-b border-zinc-100 px-6 py-4">
        <h2 className="text-base font-semibold text-zinc-900">Your Business Brief</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          This is what your agent knows about you. Edit anything — your agent retrains in the next cycle.
        </p>
        {notice && <div className="mt-3">{notice}</div>}
      </div>

      <ul className="divide-y divide-zinc-100">
        {fields.map((field) => {
          const isLowConf = field.confidence < LOW_CONFIDENCE_THRESHOLD;
          const isEditing = editingId === field.id;
          const isSaving = savingId === field.id;
          const error = errorByField[field.id];

          return (
            <li key={field.id} className="px-6 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-900">{field.label}</p>
                  {isLowConf && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800"
                      title="We're not sure about this — confirm?"
                    >
                      <AlertCircle className="h-3 w-3" />
                      Please confirm
                    </span>
                  )}
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => startEdit(field)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>

              {!isEditing ? (
                <p
                  className={cn(
                    'mt-1 whitespace-pre-line text-sm leading-relaxed text-zinc-700',
                    isLowConf && 'rounded-md ring-1 ring-amber-200 ring-offset-1 px-2 py-1 -mx-2',
                  )}
                >
                  {field.value || <span className="italic text-zinc-400">Not captured yet</span>}
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    rows={Math.min(8, Math.max(2, Math.ceil(draftValue.length / 80)))}
                    className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  {field.help && <p className="text-xs text-zinc-500">{field.help}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave(field)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
                    >
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Save & queue retrain
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </button>
                    {error && <p className="text-xs text-rose-600">{error}</p>}
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {fields.length === 0 && (
          <li className="px-6 py-8 text-center text-sm text-zinc-500">
            Your Business Brief will appear here right after your intake call.
          </li>
        )}
      </ul>
    </div>
  );
};

export default BusinessBriefEditor;
