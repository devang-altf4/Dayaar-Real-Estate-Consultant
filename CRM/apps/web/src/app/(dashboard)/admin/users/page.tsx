'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Users, Plus, Shield, UserCheck, Mail, Phone, Lock, X, CheckCircle2 } from 'lucide-react';
import { Role } from '@dayaar/shared';
import { formatDate } from '@/lib/utils';

export default function AdminUsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: Role.EMPLOYEE,
    employeeCode: '',
    phone: '',
    managerId: '',
    callingEnabled: false,
  });

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: () => api.get<any[]>('/users'),
  });

  const createUserMutation = useMutation({
    mutationFn: (payload: any) => api.post('/users', payload),
    onSuccess: () => {
      setIsModalOpen(false);
      setForm({
        name: '',
        email: '',
        password: '',
        role: Role.EMPLOYEE,
        employeeCode: '',
        phone: '',
        managerId: '',
        callingEnabled: false,
      });
      refetch();
    },
  });

  const updateCallingSeatMutation = useMutation({
    mutationFn: ({ userId, callingEnabled }: { userId: string; callingEnabled: boolean }) =>
      api.patch(`/users/${userId}`, { callingEnabled }),
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">User & Role Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage organization staff, role-based access permissions, and reporting hierarchies
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Employee / Manager</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4">User</th>
                <th className="p-4">Employee Code</th>
                <th className="p-4">Role</th>
                <th className="p-4">Assigned Manager</th>
                <th className="p-4">Status</th>
                <th className="p-4">Calling Seat</th>
                <th className="p-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : (
                users?.map((u: any) => (
                  <tr key={u._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block">{u.name}</span>
                      <span className="text-[11px] text-slate-500">{u.email}</span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-700">{u.employeeCode}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === Role.ADMIN
                            ? 'bg-purple-100 text-purple-700'
                            : u.role === Role.MANAGER
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">
                      {u.managerId?.name || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {u.isActive === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        type="button"
                        disabled={updateCallingSeatMutation.isPending || u.isActive === false}
                        onClick={() => updateCallingSeatMutation.mutate({ userId: u._id, callingEnabled: !u.callingEnabled })}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border disabled:opacity-50 ${
                          u.callingEnabled
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {u.callingEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="p-4 text-slate-400 text-[11px]">{formatDate(u.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Create New Team Member</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  placeholder="e.g. Priya Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  placeholder="priya@dayaar.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  placeholder="••••••••"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Code *</label>
                  <input
                    type="text"
                    required
                    value={form.employeeCode}
                    onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                    placeholder="EMP-109"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value={Role.EMPLOYEE}>Employee</option>
                    <option value={Role.MANAGER}>Manager</option>
                    <option value={Role.ADMIN}>Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company SIM Phone *</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  placeholder="+919876543210"
                />
                <p className="mt-1 text-[10px] text-slate-500">Must match the employee number configured in Callyzer.</p>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <input
                  type="checkbox"
                  checked={form.callingEnabled}
                  onChange={(e) => setForm({ ...form, callingEnabled: e.target.checked })}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-xs font-bold text-slate-800">Assign a calling seat</span>
                  <span className="block text-[10px] text-slate-500">Subject to the organization seat limit.</span>
                </span>
              </label>

              {(createUserMutation.error || updateCallingSeatMutation.error) && (
                <p className="text-xs text-rose-600">
                  {(createUserMutation.error as Error)?.message || (updateCallingSeatMutation.error as Error)?.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!form.name || !form.email || !form.phone || !form.employeeCode || !form.password || createUserMutation.isPending}
                onClick={() => createUserMutation.mutate(form)}
                className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                {createUserMutation.isPending ? 'Creating...' : 'Save User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
