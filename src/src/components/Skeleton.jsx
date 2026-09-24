import React from 'react'

export function Skeleton({ className = '', style = {} }) {
  return (
    <div
      className={`rounded animate-pulse ${className}`}
      style={{ background: 'rgba(14,165,233,0.06)', ...style }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="panel p-4 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-2 w-32" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex gap-3 py-2.5 border-b border-white/5">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-3 flex-1" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-14" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="panel p-4 space-y-1">
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  )
}
