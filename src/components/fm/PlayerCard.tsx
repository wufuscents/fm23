export function Avatar({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  return (
    <img
      src={src || '/placeholder-avatar.png'}
      alt={alt}
      className={`h-10 w-10 rounded-full object-cover ${className || ''}`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = '/placeholder-avatar.png';
      }}
    />
  );
}

export function Flag({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  return (
    <img
      src={src || '/placeholder-flag.png'}
      alt={alt}
      className={`h-4 w-6 object-cover rounded-sm ${className || ''}`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = '/placeholder-flag.png';
      }}
    />
  );
}
