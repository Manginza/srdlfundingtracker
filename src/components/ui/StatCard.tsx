import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  color?: 'blue' | 'green' | 'red' | 'amber' | 'gray'
}

const iconBg = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  amber: 'bg-amber-100 text-amber-600',
  gray: 'bg-gray-100 text-gray-600',
}

export default function StatCard({ label, value, icon: Icon, color = 'blue' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${iconBg[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}
