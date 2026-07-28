export function Spinner({ fullScreen = false }: { fullScreen?: boolean }) {
  const spinner = (
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-violet-500" />
  );
  if (!fullScreen) return spinner;
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      {spinner}
    </div>
  );
}
