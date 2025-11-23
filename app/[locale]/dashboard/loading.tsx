export default function Loading() {
  return (
    <div className="flex h-[100vh] w-full items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-300 border-t-transparent dark:border-neutral-700 dark:border-t-transparent" />
    </div>
  );
}
