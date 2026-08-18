'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Upload, X, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function CsvImportModal({ isOpen, onClose, onImportComplete }: CsvImportModalProps) {
  const [csvText, setCsvText] = useState(
    `Name,Phone,Project,Source,Email
Aarav Gupta,9811002233,Dayaar Heights,Meta Ads,aarav@example.com
Diya Sharma,9822003344,Emerald Bay,Google Ads,diya@example.com
Karan Kapoor,9833004455,Godrej Palm Retreat,99acres,karan@example.com`,
  );
  const [duplicateAction, setDuplicateAction] = useState<'SKIP' | 'UPDATE'>('SKIP');
  const [autoAssignStrategy, setAutoAssignStrategy] = useState<'NONE' | 'ROUND_ROBIN'>('ROUND_ROBIN');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const parseCsvToLeads = (text: string) => {
    const lines = text.trim().split('\n').filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const leads = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, any> = {};

      headers.forEach((h, idx) => {
        const val = values[idx] || '';
        if (h.includes('name')) row.name = val;
        else if (h.includes('phone') && !h.includes('alt')) row.phone = val;
        else if (h.includes('alt') || h.includes('other')) row.alternatePhone = val;
        else if (h.includes('email')) row.email = val;
        else if (h.includes('project')) row.project = val;
        else if (h.includes('source')) row.source = val;
        else if (h.includes('campaign')) row.campaign = val;
        else if (h.includes('note')) row.notes = val;
      });

      if (row.phone) {
        leads.push({
          name: row.name || 'Inquiry Contact',
          phone: row.phone,
          alternatePhone: row.alternatePhone,
          email: row.email,
          project: row.project || 'General Inquiry',
          source: row.source || 'Bulk CSV Import',
          campaign: row.campaign,
          notes: row.notes,
        });
      }
    }

    return leads;
  };

  const handleImport = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const parsedLeads = parseCsvToLeads(csvText);
      if (parsedLeads.length === 0) {
        throw new Error('Could not parse valid lead rows. Please ensure Name and Phone headers exist.');
      }

      const res: any = await api.post('/leads/import', {
        leads: parsedLeads,
        duplicateAction,
        autoAssignStrategy,
      });

      setResult(res);
      onImportComplete();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Bulk CSV Lead Importer</h3>
              <p className="text-xs text-slate-500">
                Import and distribute high-volume real estate inquiries
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-900 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Import Completed Successfully</span>
              </div>
              <p>
                Successfully imported: <b>{result.summary?.importedCount}</b> leads.
              </p>
              {result.summary?.skippedDuplicatesCount > 0 && (
                <p className="text-amber-800">
                  Skipped duplicates: <b>{result.summary.skippedDuplicatesCount}</b>
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              CSV Data (Paste Rows with Headers)
            </label>
            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-800"
              placeholder="Name,Phone,Project,Source,Email"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Duplicate Phone Action
              </label>
              <select
                value={duplicateAction}
                onChange={(e) => setDuplicateAction(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800"
              >
                <option value="SKIP">Skip Duplicates (Keep Existing Lead)</option>
                <option value="UPDATE">Update Details on Existing Lead</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Auto-Assignment Strategy
              </label>
              <select
                value={autoAssignStrategy}
                onChange={(e) => setAutoAssignStrategy(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800"
              >
                <option value="ROUND_ROBIN">Round-Robin across active team members</option>
                <option value="NONE">Leave Unassigned</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Close
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleImport}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>{loading ? 'Processing Import...' : 'Import & Distribute Leads'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
