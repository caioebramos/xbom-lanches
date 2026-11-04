export type Tier = "Tradicional" | "Especial" | "Nobre";

export type ProductKind =
  | "simple"
  | "lanche"
  | "pizza"
  | "combo-fixed"
  | "combo-large"
  | "combo-broto2"
  | "combo-broto1"
  | "combo-esfiha";

export type Price = { label: string; value: number; slices?: number };

export type Category = { slug: string; name: string; sort: number; active: boolean };

export type Product = {
  id: number;
  category: string;
  name: string;
  description: string;
  image: string | null;
  kind: ProductKind;
  tier: Tier | null;
  premium: boolean;
  prices: Price[];
  active: boolean;
  sort: number;
};

export type Addon = { id: number; name: string; detail: string | null; price: number; active: boolean; sort: number };

export type Zone = { id: number; city: string; name: string; fee: number | null; active: boolean; sort: number };

export type PaymentMethod = "Pix" | "Cartão na entrega" | "Dinheiro";

export type OrderStatus = "novo" | "preparo" | "entrega" | "concluido" | "cancelado";

export type Settings = {
  storeName: string;
  whatsapp: string;
  phone: string;
  address: string;
  openTime: string;
  closeTime: string;
  deliveryEstimate: string;
  pickupEstimate: string;
  /** auto = segue o horário · open = forçar aberto · closed = forçar fechado */
  storeMode: "auto" | "open" | "closed";
  pickupEnabled: boolean;
  pixKey: string;
  pixKeyType: "phone" | "cpf" | "cnpj" | "email" | "random";
  pixHolder: string;
  pixCity: string;
  pixQrEnabled: boolean;
  minOrder: number;
  instagram: string;
};

/** Configurações enviadas ao navegador na vitrine: sem dados de pagamento. */
export type PublicSettings = Omit<Settings, 'pixKey' | 'pixKeyType' | 'pixHolder' | 'pixCity' | 'pixQrEnabled'>;

/* ---------- Carrinho ---------- */

export type LineConfig =
  | { t: "simple" }
  | { t: "lanche"; addons: Record<number, number> }
  | { t: "pizza"; size: "Broto" | "Grande"; flavors: number[] }
  | { t: "combo-large"; pizzas: number[][]; drink: string }
  | { t: "combo-broto"; pizzas: number[][]; drink: string }
  | { t: "combo-esfiha"; esfihas: Record<number, number>; drink: string };

export type CartLine = {
  key: string;
  productId: number;
  qty: number;
  config: LineConfig;
};

export type PricedLine = {
  name: string;
  option: string;
  description: string;
  unit: number;
  image: string | null;
};

export type OrderItem = PricedLine & { qty: number; total: number };

export type OrderInput = {
  customerName: string;
  customerPhone: string;
  fulfillment: "Entrega" | "Retirada";
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string;
  payment: PaymentMethod;
  changeFor: number | null;
  notes: string;
  lines: CartLine[];
};

export type OrderRow = {
  id: number;
  code: string;
  status: OrderStatus;
  fulfillment: "Entrega" | "Retirada";
  customerName: string;
  customerPhone: string;
  city: string;
  address: string;
  payment: PaymentMethod;
  changeFor: number | null;
  notes: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paid: boolean;
  createdAt: string;
  updatedAt: string;
};
