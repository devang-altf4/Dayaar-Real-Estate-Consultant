'use client';

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Database, MapPin, Save, Smartphone } from 'lucide-react';
import { api } from '@/lib/api';

interface SettingsForm {
  name: string;
  officeLatitude: number;
  officeLongitude: number;
  allowedRadiusMeters: number;
  maxAllowedGpsAccuracyMeters: number;
  dailyCallTarget: number;
  maxUnsuccessfulAttempts: number;
  callingSeatLimit: number;
  recordingRetentionMonths: number;
  timezone: string;
}

const DEFAULTS: SettingsForm = {
  name: 'Dayaar Real Estate Consultant Pvt Ltd',
  officeLatitude: 19.296201,
  officeLongitude: 72.876082,
  allowedRadiusMeters: 10,
  maxAllowedGpsAccuracyMeters: 20,
  dailyCallTarget: 300,
  maxUnsuccessfulAttempts: 4,
  callingSeatLimit: 10,
  recordingRetentionMonths: 9,
  timezone: 'Asia/Kolkata',
};

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SettingsForm>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ['org-settings'],
    queryFn: async () => {
      const organization = await api.get<Partial<SettingsForm>>('/organizations/current');
      setForm((current) => ({ ...current, ...organization }));
      return organization;
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/organizations/settings', form),
    onSuccess: () => {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    },
  });

  const numberField = (key: keyof SettingsForm, value: string) => {
    setForm((current) => ({ ...current, [key]: Number(value) }));
  };

  if (isLoading) return <div className="p-12 text-center text-slate-400">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Organization Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure attendance, calling seats, lead retry policy, and recording retention.
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Organization settings saved.</span>
        </div>
      )}

      {saveMutation.error && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs">
          {(saveMutation.error as Error).message}
        </div>
      )}

      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Organization Name</label>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
          />
        </div>

        <section className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <MapPin className="h-4 w-4 text-sky-700" /> Office attendance geofence
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([
              ['officeLatitude', 'Latitude', '0.000001'],
              ['officeLongitude', 'Longitude', '0.000001'],
            ] as const).map(([key, label, step]) => (
              <label key={key} className="text-xs font-semibold text-slate-600">
                {label}
                <input
                  type="number"
                  step={step}
                  value={form[key]}
                  onChange={(event) => numberField(key, event.target.value)}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([
              ['allowedRadiusMeters', 'Check-in radius in metres', '1'],
              ['maxAllowedGpsAccuracyMeters', 'Max GPS accuracy error in metres', '1'],
            ] as const).map(([key, label, step]) => (
              <label key={key} className="text-xs font-semibold text-slate-600">
                {label}
                <input
                  type="number"
                  step={step}
                  min="1"
                  value={form[key]}
                  onChange={(event) => numberField(key, event.target.value)}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                />
              </label>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            Employees can check in only while their device GPS places them within the radius of the
            office pin. GPS readings less accurate than the max-error value are rejected.
          </p>
        </section>

        <section className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Smartphone className="h-4 w-4 text-emerald-700" /> SIM calling policy
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {([
              ['callingSeatLimit', 'Calling seat limit', '1'],
              ['dailyCallTarget', 'Daily call target', '1'],
              ['maxUnsuccessfulAttempts', 'Unsuccessful attempt limit', '1'],
            ] as const).map(([key, label, step]) => (
              <label key={key} className="text-xs font-semibold text-slate-600">
                {label}
                <input
                  type="number"
                  step={step}
                  value={form[key]}
                  onChange={(event) => numberField(key, event.target.value)}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Database className="h-4 w-4 text-purple-700" /> Recording lifecycle
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-600">
              B2 retention in months (6-12)
              <input
                type="number"
                min="6"
                max="12"
                value={form.recordingRetentionMonths}
                onChange={(event) => numberField('recordingRetentionMonths', event.target.value)}
                className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Organization timezone
              <input
                value={form.timezone}
                onChange={(event) => setForm({ ...form, timezone: event.target.value })}
                className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </label>
          </div>
          <p className="text-[11px] text-slate-500">The VPS disaster-recovery copy is preserved independently of user-facing B2 retention.</p>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="flex items-center gap-2 px-6 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold"
          >
            <Save className="h-4 w-4" />
            <span>{saveMutation.isPending ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
