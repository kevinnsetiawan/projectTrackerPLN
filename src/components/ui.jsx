import React from 'react';
import { statusClass, progressColor, deviasiChip } from '../utils.js';

export function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-xl shadow-pln border border-slate-100 ${className}`}>{children}</div>;
}

export function StatusBadge({ status, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusClass(status)} ${className}`}>
      {status}
    </span>
  );
}

export function ProgressBar({ value, status, className = '' }) {
  const v = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className={`w-full h-2.5 bg-slate-200 rounded-full overflow-hidden ${className}`}>
      <div className={`h-full rounded-full ${progressColor(status)} transition-all`} style={{ width: `${v}%` }} />
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, accent = 'text-pln-blue' }) {
  return (
    <Card className="p-4 sm:p-5 animate-fade-up">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{label}</div>
          <div className={`mt-2 text-xl md:text-2xl font-extrabold leading-tight break-words ${accent}`}>{value}</div>
          {sub && <div className="mt-1 text-[11px] sm:text-xs text-slate-500 leading-tight break-words">{sub}</div>}
        </div>
        {Icon && (
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-pln-lightcyan flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-pln-cyan" />
          </div>
        )}
      </div>
    </Card>
  );
}

export function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export const inputCls =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pln-cyan focus:border-transparent bg-white';

export function DevChip({ dev }) {
  const c = deviasiChip(dev);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${c.cls}`}>
      {c.label}
    </span>
  );
}

export function Spinner({ show }) {
  return show ? (
    <div className="flex justify-center py-16">
      <div className="w-10 h-10 border-4 border-pln-lightcyan border-t-pln-cyan rounded-full animate-spin" />
    </div>
  ) : null;
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div>
        <h2 className="text-xl font-extrabold text-pln-navy">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ message = 'Belum ada data.' }) {
  return (
    <div className="text-center py-16 text-slate-400">
      <div className="text-4xl mb-2">🗂️</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function BadgeIcon({ children, cls }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>{children}</span>;
}