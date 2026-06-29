import { useCallback, useState } from "react";

export function useOperationStatus() {
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  const withLoading = useCallback(async (task: () => Promise<void>) => {
    setLoading(true);
    setError("");
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "サーバーとの通信に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  return { toast, error, loading, setError, withLoading, showToast };
}
