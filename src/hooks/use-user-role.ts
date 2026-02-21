import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type AppRole = "admin" | "user" | "client";

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    (async () => {
      const { data } = await supabase.rpc("get_user_role", { _user_id: user.id });
      setRole((data as AppRole) || "client");
      setLoading(false);
    })();
  }, [user]);

  return {
    role,
    loading,
    isAdmin: role === "admin",
    isUser: role === "user" || role === "admin",
    isClient: role === "client",
  };
}
