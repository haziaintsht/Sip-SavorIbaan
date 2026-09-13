import { Wifi } from "lucide-react";

export type ReceiptItem = { key: string; name: string; unitPrice: number; quantity: number };

export type ReceiptData = {
  id: string;
  createdAt: string;
  branch: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  containerFee: number;
  containerCount: number;
  diningOption: string;
  total: number;
  paymentMethod: string;
  customerName: string | null;
  cashReceived?: number | null;
  changeDue?: number | null;
  discountReason?: string | null;
  discountNote?: string | null;
  wifiSsid?: string | null;
  wifiPassword?: string | null;
};

export default function Receipt({ data }: { data: ReceiptData }) {
  return (
    <div className="mx-auto max-w-xs font-mono text-xs text-black">
      <p className="text-center text-sm font-bold">SIP &amp; SAVOR SPOT</p>
      <p className="text-center">{data.branch} Branch</p>
      <p className="text-center">{new Date(data.createdAt).toLocaleString("en-PH")}</p>
      <p className="mt-1 text-center">Order #{data.id.slice(0, 8)}</p>
      <p className="text-center">{data.diningOption}</p>
      <div className="my-2 border-t border-dashed border-black" />
      {data.items.map((l) => (
        <div key={l.key} className="flex justify-between">
          <span>
            {l.quantity}x {l.name}
          </span>
          <span>₱{(l.unitPrice * l.quantity).toFixed(2)}</span>
        </div>
      ))}
      <div className="my-2 border-t border-dashed border-black" />
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>₱{data.subtotal.toFixed(2)}</span>
      </div>
      {data.discount > 0 && (
        <div className="flex justify-between">
          <span>Discount{data.discountReason ? ` (${data.discountReason})` : ""}</span>
          <span>−₱{data.discount.toFixed(2)}</span>
        </div>
      )}
      {data.discountNote && <p className="text-[10px]">Note: {data.discountNote}</p>}
      {data.tax > 0 && (
        <div className="flex justify-between">
          <span>Tax</span>
          <span>+₱{data.tax.toFixed(2)}</span>
        </div>
      )}
      {data.containerFee > 0 && (
        <div className="flex justify-between">
          <span>Take-out container x{data.containerCount}</span>
          <span>+₱{data.containerFee.toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold">
        <span>TOTAL</span>
        <span>₱{data.total.toFixed(2)}</span>
      </div>
      <div className="my-2 border-t border-dashed border-black" />
      <p>Payment: {data.paymentMethod}</p>
      {data.cashReceived != null && (
        <div className="flex justify-between">
          <span>Cash received</span>
          <span>₱{data.cashReceived.toFixed(2)}</span>
        </div>
      )}
      {data.changeDue != null && (
        <div className="flex justify-between">
          <span>Change</span>
          <span>₱{data.changeDue.toFixed(2)}</span>
        </div>
      )}
      {data.customerName && <p>Customer: {data.customerName}</p>}
      {(data.wifiSsid || data.wifiPassword) && (
        <>
          <div className="my-2 border-t border-dashed border-black" />
          <p className="flex items-center justify-center gap-1 text-center">
            <Wifi className="h-3 w-3" strokeWidth={2.25} /> WiFi: {data.wifiSsid ?? "—"}
          </p>
          {data.wifiPassword && <p className="text-center">Password: {data.wifiPassword}</p>}
        </>
      )}
      <p className="mt-3 text-center">Salamat po! Tara, Kape ulit!</p>
    </div>
  );
}
