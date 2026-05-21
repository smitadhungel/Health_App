const variants = {
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
  gray: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function Badge({ label, variant = 'gray' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]}`}>
      {label}
    </span>
  );
}
