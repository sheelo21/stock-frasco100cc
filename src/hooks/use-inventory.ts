import { useState, useEffect, useCallback } from "react";
import {
  getProducts,
  getProductByBarcode,
  getProductById,
  getLogs,
  updateStock,
  setStock,
  subscribe,
  type Product,
  type StockLog,
} from "@/lib/inventory-store";

export function useInventory() {
  const [products, setProducts] = useState<Product[]>(getProducts);
  const [logs, setLogs] = useState<StockLog[]>(getLogs);

  useEffect(() => {
    return subscribe(() => {
      setProducts(getProducts());
      setLogs(getLogs());
    });
  }, []);

  const findByBarcode = useCallback((barcode: string) => {
    return getProductByBarcode(barcode);
  }, []);

  const findById = useCallback((id: string) => {
    return getProductById(id);
  }, []);

  const addStock = useCallback((productId: string) => {
    return updateStock(productId, 1, "in");
  }, []);

  const removeStock = useCallback((productId: string) => {
    return updateStock(productId, -1, "out");
  }, []);

  const setStockValue = useCallback((productId: string, value: number) => {
    return setStock(productId, value);
  }, []);

  return {
    products,
    logs,
    findByBarcode,
    findById,
    addStock,
    removeStock,
    setStockValue,
  };
}
