'use client';

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@dayaar/shared';
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileUp,
  FileText,
  Link2,
  Users,
} from 'lucide-react';

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type Tab = 'file' | 'text' | 'gsheet';
interface EmployeeOption {
  _id: string;
  name: string;
  isActive?: boolean;
}

const asList = (res: any): EmployeeOption[] =>
  Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

export function LeadImportModal({ isOpen, onClose, onImportComplete }: LeadImportModalProps) {
  const { user, isAdmin, isManager } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('file');
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [duplicateAction, setDuplicateAction] = useState<'SKIP' | 'UPDATE'>('SKIP');
  const [autoAssignStrategy, setAutoAssignStrategy] = useState<'NONE' | 'ROUND_ROBIN'>(
    'ROUND_ROBIN',
  );
  const [scope, setScope] = useState<'TEAM' | 'ORGANIZATION'>('TEAM');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const teamQuery = useQuery({
    queryKey: ['import-team'],
    queryFn: () => api.get<any>('/users/team'),
    enabled: isOpen && !!isManager,
  });

  const orgQuery = useQuery({
    queryKey: ['import-org-employees'],
    queryFn: () =>
      isAdmin
        ? api.get<any>('/users', { role: Role.EMPLOYEE })
        : api.get<any>('/users', { role: Role.EMPLOYEE, scope: 'organization' }),
    enabled: isOpen && (isAdmin || (isManager && scope === 'ORGANIZATION')),
  });

  const employeeOptions: EmployeeOption[] = isAdmin
    ? asList(orgQuery.data)
    : scope === 'TEAM'
    ? asList(teamQuery.data)
    : asList(orgQuery.data);

  if (!isOpen) return null;

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const allActiveSelected =
    employeeOptions.filter((e) => e.isActive !== false).length > 0 &&
    employeeOptions
      .filter((e) => e.isActive !== false)
      .every((e) => selectedIds.includes(e._id));

  const buildCommonPayload = () => ({
    duplicateAction,
    autoAssignStrategy,
    assignScope: scope,
    targetEmployeeIds:
      autoAssignStrategy === 'ROUND_ROBIN' && selectedIds.length > 0 ? selectedIds : undefined,
  });

  const handleImport = async () => {
    setError('');
    setResult(null);

    if (tab === 'file' && !file) {
      setError('Choose a .xlsx, .xls, .csv or .tsv/.txt file first.');
      return;
    }
    if (tab === 'text' && !csvText.trim()) {
      setError('Paste some lead data first.');
      return;
    }
    if (tab === 'gsheet' && !sheetUrl.trim()) {
      setError('Paste the Google Sheets link first.');
      return;
    }

    setLoading(true);
    try {
      let res: any;
      if (tab === 'file') {
        const form = new FormData();
        form.append('file', file as File);
        const common = buildCommonPayload();
        form.append('duplicateAction', common.duplicateAction);
        form.append('autoAssignStrategy', common.autoAssignStrategy);
        form.append('assignScope', common.assignScope);
        if (common.targetEmployeeIds) {
          form.append('targetEmployeeIds', common.targetEmployeeIds.join(','));
        }
        res = await api.post('/leads/import/file', form);
      } else if (tab === 'text') {
        res = await api.post('/leads/import/text', { text: csvText, ...buildCommonPayload() });
      } else {
        res = await api.post('/leads/import/google-sheet', {
          url: sheetUrl.trim(),
          ...buildCommonPayload(),
        });
      }
      setResult(res);
      onImportComplete();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const tabs: Array<{ key: Tab; label: string; icon: any }> = [
    { key: 'file', label: 'Upload File', icon: FileUp },
    { key: 'text', label: 'Paste Data', icon: FileText },
    { key: 'gsheet', label: 'Google Sheet', icon: Link2 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Bulk Lead Importer</h3>
              <p className="text-xs text-slate-500">
                Excel, CSV or Google Sheets — names and numbers are separated automatically
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-900 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Import Completed</span>
              </div>
              <p>
                Imported: <b>{result.summary?.importedCount}</b> leads
                {result.summary?.skippedDuplicatesCount > 0 && (
                  <> · Skipped duplicates: <b>{result.summary.skippedDuplicatesCount}</b></>
                )}
                {result.summary?.errorsCount > 0 && (
                  <> · Row errors: <b className="text-rose-700">{result.summary.errorsCount}</b></>
                )}
              </p>
              {result.parseWarnings?.length > 0 && (
                <details className="text-amber-800">
                  <summary className="cursor-pointer font-semibold">
                    {result.parseWarnings.length} parsing note(s)
                  </summary>
                  <ul className="list-disc pl-4 pt-1 space-y-0.5">
                    {result.parseWarnings.slice(0, 10).map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </details>
              )}
              {result.skippedDuplicates?.length > 0 && (
                <details className="text-amber-800">
                  <summary className="cursor-pointer font-semibold">
                    Duplicate details ({result.skippedDuplicates.length})
                  </summary>
                  <ul className="list-disc pl-4 pt-1 space-y-0.5">
                    {result.skippedDuplicates.slice(0, 10).map((d: any, i: number) => (
                      <li key={i}>{d.row?.phone || d.row?.name}: {d.reason}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* Source tabs */}
          <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors ${
                  tab === key
                    ? 'bg-white text-sky-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {tab === 'file' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lead File</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) setFile(dropped);
                }}
                className="w-full border-2 border-dashed border-slate-300 hover:border-sky-500 hover:bg-sky-50/50 rounded-xl p-6 flex flex-col items-center gap-2 transition-colors"
              >
                <Upload className="h-6 w-6 text-slate-400" />
                {file ? (
                  <span className="text-xs font-semibold text-sky-800">{file.name}</span>
                ) : (
                  <>
                    <span className="text-xs font-semibold text-slate-600">
                      Click to choose or drag & drop
                    </span>
                    <span className="text-[11px] text-slate-400">.xlsx .xls .csv .tsv .txt — max 10 MB</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          )}

          {tab === 'text' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Paste rows (CSV/TSV, with or without headers — e.g. “Aarav Gupta, 9811002233”)
              </label>
              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-800"
                placeholder={'Name,Phone\nAarav Gupta,+91 9811002233\n9822003344'}
              />
            </div>
          )}

          {tab === 'gsheet' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Google Sheets Link
              </label>
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-800"
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                The sheet must be shared as “Anyone with the link”. Each tab (gid) imports separately.
              </p>
            </div>
          )}

          {/* Import options */}
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
                <option value="ROUND_ROBIN">
                  Round-Robin (distribute equally across selected employees)
                </option>
                <option value="NONE">Leave Unassigned</option>
              </select>
            </div>
          </div>

          {/* Employee distribution picker */}
          {autoAssignStrategy === 'ROUND_ROBIN' && (
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Users className="h-4 w-4 text-sky-700" />
                  Distribute Across
                </div>
                {(allActiveSelected || selectedIds.length > 0) && (
                  <div className="flex gap-2 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedIds(
                          employeeOptions
                            .filter((e) => e.isActive !== false)
                            .map((e) => e._id),
                        )
                      }
                      className="text-sky-700 hover:text-sky-900"
                    >
                      Select all active
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {isManager && (
                <div className="flex gap-1.5 p-1 bg-slate-200/60 rounded-lg w-fit">
                  <button
                    type="button"
                    onClick={() => {
                      setScope('TEAM');
                      setSelectedIds([]);
                    }}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-md ${
                      scope === 'TEAM' ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    My Team Only
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScope('ORGANIZATION');
                      setSelectedIds([]);
                    }}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-md ${
                      scope === 'ORGANIZATION'
                        ? 'bg-white text-sky-800 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    Entire Organization
                  </button>
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                {selectedIds.length === 0
                  ? 'No selection = all active employees in this list receive an equal share.'
                  : `${selectedIds.length} selected — leads will be split equally among them.`}
              </p>

              <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {employeeOptions.map((emp) => {
                  const inactive = emp.isActive === false;
                  return (
                    <label
                      key={emp._id}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                        inactive
                          ? 'opacity-40 cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400'
                          : selectedIds.includes(emp._id)
                          ? 'border-sky-400 bg-sky-50 text-sky-900 cursor-pointer'
                          : 'border-slate-200 bg-white text-slate-700 cursor-pointer hover:border-sky-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={inactive}
                        checked={selectedIds.includes(emp._id)}
                        onChange={() => toggleEmployee(emp._id)}
                        className="accent-sky-700"
                      />
                      <span className="truncate">{emp.name}</span>
                      {inactive && <span className="text-[10px] ml-auto">(inactive)</span>}
                    </label>
                  );
                })}
                {employeeOptions.length === 0 && (
                  <p className="text-[11px] text-slate-400 col-span-2 py-2">
                    No employees found for this scope.
                  </p>
                )}
              </div>
            </div>
          )}
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
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow transition-colors disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            <span>{loading ? 'Processing Import...' : 'Import & Distribute Leads'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
