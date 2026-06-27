// Props skeleton-блока.
type SkeletonProps = {
  // className задает размер конкретного placeholder.
  className?: string;
};

// Skeleton — минимальный loading placeholder без бизнес-логики.
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse border border-line bg-white/8 ${className}`}
    />
  );
}

// SkeletonStack — быстрый набор строк для загрузки текстового блока.
export function SkeletonStack() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-5/6" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
