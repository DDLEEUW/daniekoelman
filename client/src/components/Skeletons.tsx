function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-white/5 rounded ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="glass p-8 flex items-center gap-6">
        <Shimmer className="w-20 h-20 rounded-full" />
        <div className="flex-1 space-y-3">
          <Shimmer className="h-4 w-32" />
          <Shimmer className="h-8 w-64" />
        </div>
      </div>
      <Shimmer className="h-24" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Shimmer className="h-80" />
        <Shimmer className="h-80" />
      </div>
      <Shimmer className="h-72" />
    </div>
  );
}
