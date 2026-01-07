interface LoadingStateProps {
  message?: string;
}

export function LoadingState({
  message = "Extracting page content...",
}: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center h-full p-8 bg-primary">
      <div className="animate-pulse text-placeholder">{message}</div>
    </div>
  );
}

interface ErrorStateProps {
  error: string;
  hint?: string;
}

export function ErrorState({
  error,
  hint = "Make sure the page is fully loaded and try again.",
}: ErrorStateProps) {
  return (
    <div className="p-4 bg-primary">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        {hint && (
          <p className="text-red-500 dark:text-red-500 text-xs mt-2">{hint}</p>
        )}
      </div>
    </div>
  );
}

interface ErrorToastProps {
  error: string;
}

export function ErrorToast({ error }: ErrorToastProps) {
  return (
    <div className="mx-4 mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">
      <p className="text-red-700 dark:text-red-400 text-xs">{error}</p>
    </div>
  );
}
