import { listOrders, startOfDayBR } from "@/lib/orders";
import OrdersBoard from "./OrdersBoard";

export const dynamic = "force-dynamic";

export default function AdminHome() {
  return <OrdersBoard initial={listOrders({ since: startOfDayBR(1), limit: 400 })} />;
}
