'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Settings, MapPin, Target, Building, Save, CheckCircle2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const [form, setForm] = useState({
    name: 'Dayaar Real Estate Consultant Pvt Ltd',
    latitude: 28.4595,
    longitude: 77.0266,
    geofenceRadiusMeters: 100,
    dailyCallTarget: 300,
  });
  const [saved, setSaved] = useState(false);

  const { data: org, isLoading } = useQuery({
    queryKey: ['org-settings'],
    queryFn: async () => {
      const res: any = await api.get('/organizations/current');
      if (res) {
        setForm({
          name: res.name || form.name,
          latitude: res.settings?.officeLocation?.latitude || form.latitude,
          longitude: res.settings?.officeLocation?.longitude || form.longitude,
          geofenceRadiusMeters: res.settings?.officeLocation?.radiusMeters || form.geofenceRadiusMeters,
          dailyCallTarget: res.settings?.dailyCallTarget || form.dailyCallTarget,
        });
      }
      return res;
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch('/organizations/current', {
        name: form.name,
        settings: {
          officeLocation: {
            latitude: Number(form.latitude),
            longitude: Number(form.longitude),
            radiusMeters: Number(form.geofenceRadiusMeters),
          },
          dailyCallTarget: Number(form.dailyCallTarget),
        },
      }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Organization & Geofence Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure office GPS coordinates, geofence radius for attendance, and daily 300-call quota
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>Organization settings saved successfully!</span>
        </div>
      )}

      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Organization Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
          />
        </div>

        {/* Geofence GPS Coordinates */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <MapPin className="h-4 w-4 text-sky-700" />
            <span>Office GPS Geofence Configuration</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Office Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Office Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Allowed Radius (Meters)</label>
              <input
                type="number"
                value={form.geofenceRadiusMeters}
                onChange={(e) => setForm({ ...form, geofenceRadiusMeters: Number(e.target.value) })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Employees checking in from beyond {form.geofenceRadiusMeters}m of ({form.latitude}, {form.longitude}) will have attendance rejected.
          </p>
        </div>

        {/* Call Target Configuration */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Target className="h-4 w-4 text-amber-600" />
            <span>Telecalling Quota Target</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Daily Calls Target per Telecaller
            </label>
            <input
              type="number"
              value={form.dailyCallTarget}
              onChange={(e) => setForm({ ...form, dailyCallTarget: Number(e.target.value) })}
              className="w-48 text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="flex items-center gap-2 px-6 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{saveMutation.isPending ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
