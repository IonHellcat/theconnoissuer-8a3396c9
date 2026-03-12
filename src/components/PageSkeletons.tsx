import { Skeleton } from "@/components/ui/skeleton";

/** Home / Index page skeleton */
export const HomeSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Navbar placeholder */}
    <div className="h-16 border-b border-border/30" />
    {/* Hero */}
    <div className="flex flex-col items-center justify-center py-24 px-4 gap-4">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <Skeleton className="h-12 w-64 mt-4 rounded-full" />
    </div>
    {/* City grid */}
    <div className="container mx-auto px-4 max-w-6xl">
      <Skeleton className="h-8 w-48 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

/** City detail / Explore page skeleton */
export const CityPageSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="h-16 border-b border-border/30" />
    <div className="container mx-auto px-4 max-w-6xl pt-24">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-5 w-72 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden">
            <Skeleton className="aspect-[16/10]" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** Lounge detail page skeleton */
export const LoungePageSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="h-16 border-b border-border/30" />
    <div className="container mx-auto px-4 max-w-4xl pt-24">
      <Skeleton className="h-6 w-24 mb-4" />
      <Skeleton className="aspect-[16/9] rounded-xl mb-6" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  </div>
);

/** Search results skeleton */
export const SearchPageSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="h-16 border-b border-border/30" />
    <div className="container mx-auto px-4 max-w-6xl pt-24">
      <Skeleton className="h-10 w-full max-w-lg mb-8" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 rounded-xl overflow-hidden">
            <Skeleton className="w-40 h-28 shrink-0" />
            <div className="flex-1 py-2 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** For You page skeleton */
export const ForYouSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="h-16 border-b border-border/30" />
    <div className="container mx-auto px-4 max-w-lg pt-24 space-y-5">
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-32 mx-auto" />
        <Skeleton className="h-4 w-56 mx-auto" />
      </div>
      <Skeleton className="h-5 w-20" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
      <Skeleton className="h-5 w-20" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    </div>
  </div>
);

/** Auth page skeleton */
export const AuthSkeleton = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-full max-w-md px-4 space-y-4">
      <Skeleton className="h-8 w-40 mx-auto" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  </div>
);

/** Profile page skeleton */
export const ProfileSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="h-16 border-b border-border/30" />
    <div className="container mx-auto px-4 max-w-4xl pt-24 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

/** Admin page skeleton */
export const AdminSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="h-16 border-b border-border/30" />
    <div className="container mx-auto px-4 max-w-6xl pt-24 space-y-4">
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-5 w-96 max-w-full mb-6" />
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-32 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);

/** Generic minimal skeleton fallback */
export const GenericSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="h-16 border-b border-border/30" />
    <div className="container mx-auto px-4 max-w-4xl pt-24 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <Skeleton className="h-64 w-full rounded-xl mt-6" />
    </div>
  </div>
);
