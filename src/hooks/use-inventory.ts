import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Product {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  image_url: string | null;
  category: string | null;
  product_number: string | null;
  model_number: string | null;
  catalog_page: string | null;
  parent_category: string | null;
  sub_category: string | null;
  color: string | null;
  price_with_tax: number | null;
  price_without_tax: number | null;
  size: string | null;
  is_new: boolean;
}

export interface StockLog {
  id: string;
  product_id: string;
  user_id: string;
  change: number;
  new_stock: number;
  type: string;
  created_at: string;
  product_name?: string;
  display_name?: string;
}

export function useInventory() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    const allProducts: Product[] = [];
    const PAGE_SIZE = 1000;
    let from = 0;
    let hasMore = true;
    while (hasMore) {
      const { data } = await supabase
        .from("products")
        .select("*")
        .order("name")
        .range(from, from + PAGE_SIZE - 1);
      if (data && data.length > 0) {
        allProducts.push(...(data as Product[]));
        from += PAGE_SIZE;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }
    setProducts(allProducts);
  }, []);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("stock_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data) {
      // Enrich with product names
      const productIds = [...new Set(data.map((l: any) => l.product_id))];
      const { data: prods } = await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds);
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name");

      const prodMap = new Map((prods || []).map((p: any) => [p.id, p.name]));
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));

      setLogs(
        data.map((l: any) => ({
          ...l,
          product_name: prodMap.get(l.product_id) || "不明",
          display_name: profileMap.get(l.user_id) || "不明",
        }))
      );
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchProducts(), fetchLogs()]);
    setLoading(false);
  }, [fetchProducts, fetchLogs]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const findByBarcode = useCallback(
    (barcode: string) => products.find((p) => p.barcode === barcode),
    [products]
  );

  const findById = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products]
  );

  const addStock = useCallback(
    async (productId: string, quantity: number = 1) => {
      const product = products.find((p) => p.id === productId);
      if (!product || !user || quantity <= 0) return false;

      const newStock = product.stock + quantity;
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", productId);
      if (updateError) return false;

      await supabase.from("stock_logs").insert({
        product_id: productId,
        user_id: user.id,
        change: quantity,
        new_stock: newStock,
        type: "in",
      });

      await refresh();
      return true;
    },
    [products, user, refresh]
  );

  const removeStock = useCallback(
    async (productId: string, quantity: number = 1) => {
      const product = products.find((p) => p.id === productId);
      if (!product || !user || quantity <= 0 || product.stock < quantity) return false;

      const newStock = product.stock - quantity;
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", productId);
      if (updateError) return false;

      await supabase.from("stock_logs").insert({
        product_id: productId,
        user_id: user.id,
        change: -quantity,
        new_stock: newStock,
        type: "out",
      });

      await refresh();
      return true;
    },
    [products, user, refresh]
  );

  const setStockValue = useCallback(
    async (productId: string, value: number) => {
      const product = products.find((p) => p.id === productId);
      if (!product || !user || value < 0) return false;

      const change = value - product.stock;
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: value })
        .eq("id", productId);
      if (updateError) return false;

      await supabase.from("stock_logs").insert({
        product_id: productId,
        user_id: user.id,
        change,
        new_stock: value,
        type: "manual",
      });

      await refresh();
      return true;
    },
    [products, user, refresh]
  );

  return {
    products,
    logs,
    loading,
    findByBarcode,
    findById,
    addStock,
    removeStock,
    setStockValue,
    refresh,
  };
}
