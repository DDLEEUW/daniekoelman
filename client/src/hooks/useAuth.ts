import { useEffect, useState } from "react";
import { api } from "../lib/api";

export type Me = Awaited<ReturnType<typeof api.me>>;

export function useAuth() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((u) => setMe(u))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  return { me, loading, setMe };
}
