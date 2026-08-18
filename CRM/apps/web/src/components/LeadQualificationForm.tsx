'use client';

import React, { useState } from 'react';
import {
  ILeadQualification,
  PropertyType,
  BhkType,
  PurchasePurpose,
  PurchaseTimeline,
  FinancingType,
  LeadStatus,
  Temperature,
} from '@dayaar/shared';
import { api } from '@/lib/api';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';

interface LeadQualificationFormProps {
  leadId: string;
  initialQualification?: ILeadQualification;
  currentStatus: LeadStatus;
  currentTemperature: Temperature;
  onSaved?: () => void;
}

export function LeadQualificationForm({
  leadId,
  initialQualification = {},
  currentStatus,
  currentTemperature,
  onSaved,
}: LeadQualificationFormProps) {
  const [formData, setFormData] = useState<ILeadQualification>({
    budgetMin: initialQualification.budgetMin || 10000000,
    budgetMax: initialQualification.budgetMax || 25000000,
    propertyType: initialQualification.propertyType || PropertyType.APARTMENT,
    bhk: initialQualification.bhk || BhkType.THREE_BHK,
    purpose: initialQualification.purpose || PurchasePurpose.SELF_USE,
    purchaseTimeline: initialQualification.purchaseTimeline || PurchaseTimeline.ONE_TO_THREE_MONTHS,
    financing: initialQualification.financing || FinancingType.LOAN,
    loanStatus: initialQualification.loanStatus || '',
    siteVisitInterested: initialQualification.siteVisitInterested ?? false,
    siteVisitDate: initialQualification.siteVisitDate ? new Date(initialQualification.siteVisitDate).toISOString().split('T')[0] : '',
    notes: initialQualification.notes || '',
  });

  const [temperature, setTemperature] = useState<Temperature>(currentTemperature || Temperature.WARM);
  const [status, setStatus] = useState<LeadStatus>(currentStatus || LeadStatus.INTERESTED);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await api.patch(`/leads/${leadId}/disposition`, {
        status,
        temperature,
        qualification: {
          ...formData,
          budgetMin: Number(formData.budgetMin),
          budgetMax: Number(formData.budgetMax),
          siteVisitDate: formData.siteVisitDate ? new Date(formData.siteVisitDate) : null,
        },
      });

      setMessage({ type: 'success', text: 'Lead qualification updated successfully!' });
      if (onSaved) onSaved();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save qualification' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h4 className="text-sm font-bold text-slate-800">Structured Property Qualification</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Temperature:</span>
          <select
            value={temperature}
            onChange={(e) => setTemperature(e.target.value as Temperature)}
            className="text-xs p-1.5 rounded-lg border border-slate-300 font-bold bg-white text-slate-800"
          >
            <option value={Temperature.HOT}>🔥 HOT</option>
            <option value={Temperature.WARM}>☀️ WARM</option>
            <option value={Temperature.COLD}>❄️ COLD</option>
            <option value={Temperature.UNQUALIFIED}>UNQUALIFIED</option>
          </select>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 text-xs rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Budget Range */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Min Budget (₹)</label>
          <input
            type="number"
            value={formData.budgetMin || ''}
            onChange={(e) => setFormData({ ...formData, budgetMin: Number(e.target.value) })}
            className="w-full text-xs p-2 rounded-lg border border-slate-300"
            placeholder="e.g. 10000000"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Max Budget (₹)</label>
          <input
            type="number"
            value={formData.budgetMax || ''}
            onChange={(e) => setFormData({ ...formData, budgetMax: Number(e.target.value) })}
            className="w-full text-xs p-2 rounded-lg border border-slate-300"
            placeholder="e.g. 25000000"
          />
        </div>

        {/* Property Type & BHK */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Property Type</label>
          <select
            value={formData.propertyType}
            onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as PropertyType })}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
          >
            {Object.values(PropertyType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Configuration (BHK)</label>
          <select
            value={formData.bhk}
            onChange={(e) => setFormData({ ...formData, bhk: e.target.value as BhkType })}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
          >
            {Object.values(BhkType).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Purpose & Timeline */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Purchase Purpose</label>
          <select
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value as PurchasePurpose })}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
          >
            {Object.values(PurchasePurpose).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Purchase Timeline</label>
          <select
            value={formData.purchaseTimeline}
            onChange={(e) => setFormData({ ...formData, purchaseTimeline: e.target.value as PurchaseTimeline })}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
          >
            {Object.values(PurchaseTimeline).map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </select>
        </div>

        {/* Financing */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Financing Mode</label>
          <select
            value={formData.financing}
            onChange={(e) => setFormData({ ...formData, financing: e.target.value as FinancingType })}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
          >
            {Object.values(FinancingType).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Loan Eligibility / Bank Status</label>
          <input
            type="text"
            value={formData.loanStatus || ''}
            onChange={(e) => setFormData({ ...formData, loanStatus: e.target.value })}
            className="w-full text-xs p-2 rounded-lg border border-slate-300"
            placeholder="e.g. Pre-approved from HDFC"
          />
        </div>
      </div>

      {/* Site Visit Section */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.siteVisitInterested || false}
            onChange={(e) => setFormData({ ...formData, siteVisitInterested: e.target.checked })}
            className="rounded text-sky-700 focus:ring-sky-600 h-4 w-4"
          />
          <span className="text-xs font-bold text-slate-800">Customer is interested in a physical Site Visit</span>
        </label>

        {formData.siteVisitInterested && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Scheduled Site Visit Date</label>
            <input
              type="date"
              value={typeof formData.siteVisitDate === 'string' ? formData.siteVisitDate : ''}
              onChange={(e) => setFormData({ ...formData, siteVisitDate: e.target.value })}
              className="text-xs p-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>
        )}
      </div>

      {/* Structured Notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Detailed Customer Notes</label>
        <textarea
          rows={3}
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Client preferences, preferred floor, specific tower, or broker references..."
          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow transition-colors"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Qualification'}</span>
        </button>
      </div>
    </form>
  );
}
