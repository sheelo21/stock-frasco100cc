export interface Product {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  imageUrl: string;
  category: string;
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  change: number;
  newStock: number;
  timestamp: Date;
  type: "in" | "out" | "manual";
}

// Mock products
const initialProducts: Product[] = [
  {
    id: "1",
    name: "ボルト M8×30 (100本入)",
    barcode: "4901234567890",
    stock: 150,
    imageUrl: "/placeholder.svg",
    category: "ボルト・ナット",
  },
  {
    id: "2",
    name: "絶縁テープ 黒 19mm",
    barcode: "4902345678901",
    stock: 42,
    imageUrl: "/placeholder.svg",
    category: "テープ",
  },
  {
    id: "3",
    name: "軍手 Lサイズ (12双入)",
    barcode: "4903456789012",
    stock: 8,
    imageUrl: "/placeholder.svg",
    category: "安全用品",
  },
  {
    id: "4",
    name: "ケーブルタイ 200mm (100本)",
    barcode: "4904567890123",
    stock: 200,
    imageUrl: "/placeholder.svg",
    category: "配線部品",
  },
  {
    id: "5",
    name: "防塵マスク DS2 (10枚入)",
    barcode: "4905678901234",
    stock: 3,
    imageUrl: "/placeholder.svg",
    category: "安全用品",
  },
];

let products = [...initialProducts];
let logs: StockLog[] = [
  {
    id: "log1",
    productId: "1",
    productName: "ボルト M8×30 (100本入)",
    change: 50,
    newStock: 150,
    timestamp: new Date(Date.now() - 3600000 * 2),
    type: "in",
  },
  {
    id: "log2",
    productId: "3",
    productName: "軍手 Lサイズ (12双入)",
    change: -4,
    newStock: 8,
    timestamp: new Date(Date.now() - 3600000),
    type: "out",
  },
];

let listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getProducts(): Product[] {
  return [...products];
}

export function getProductByBarcode(barcode: string): Product | undefined {
  return products.find((p) => p.barcode === barcode);
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getLogs(): StockLog[] {
  return [...logs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function updateStock(
  productId: string,
  change: number,
  type: "in" | "out" | "manual"
): boolean {
  const product = products.find((p) => p.id === productId);
  if (!product) return false;

  const newStock = product.stock + change;
  if (newStock < 0) return false;

  product.stock = newStock;

  const log: StockLog = {
    id: `log_${Date.now()}`,
    productId,
    productName: product.name,
    change,
    newStock,
    timestamp: new Date(),
    type,
  };
  logs.push(log);
  notify();
  return true;
}

export function setStock(productId: string, newStock: number): boolean {
  const product = products.find((p) => p.id === productId);
  if (!product || newStock < 0) return false;

  const change = newStock - product.stock;
  product.stock = newStock;

  const log: StockLog = {
    id: `log_${Date.now()}`,
    productId,
    productName: product.name,
    change,
    newStock,
    timestamp: new Date(),
    type: "manual",
  };
  logs.push(log);
  notify();
  return true;
}
