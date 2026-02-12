import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface DropdownOption {
  id: string;
  type: string;
  value: string;
  sort_order: number;
}

export const OPTION_TYPES = {
  parent_category: "親カテゴリ",
  sub_category: "子カテゴリ",
  color: "カラー",
  size: "サイズ",
} as const;

export type OptionType = keyof typeof OPTION_TYPES;

export function useDropdownOptions() {
  const { user } = useAuth();
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOptions = useCallback(async () => {
    const { data } = await supabase
      .from("dropdown_options")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setOptions(data as DropdownOption[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchOptions();
  }, [user, fetchOptions]);

  const getOptionsByType = useCallback(
    (type: OptionType) => options.filter((o) => o.type === type),
    [options]
  );

  const addOption = useCallback(
    async (type: OptionType, value: string) => {
      const existing = options.filter((o) => o.type === type);
      const maxOrder = existing.length > 0
        ? Math.max(...existing.map((o) => o.sort_order))
        : -1;
      const { error } = await supabase.from("dropdown_options").insert({
        type,
        value: value.trim(),
        sort_order: maxOrder + 1,
      });
      if (error) return false;
      await fetchOptions();
      return true;
    },
    [options, fetchOptions]
  );

  const removeOption = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("dropdown_options")
        .delete()
        .eq("id", id);
      if (error) return false;
      await fetchOptions();
      return true;
    },
    [fetchOptions]
  );

  const reorderOptions = useCallback(
    async (type: OptionType, orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase
          .from("dropdown_options")
          .update({ sort_order: index })
          .eq("id", id)
      );
      await Promise.all(updates);
      await fetchOptions();
    },
    [fetchOptions]
  );

  return {
    options,
    loading,
    getOptionsByType,
    addOption,
    removeOption,
    reorderOptions,
    refresh: fetchOptions,
  };
}
