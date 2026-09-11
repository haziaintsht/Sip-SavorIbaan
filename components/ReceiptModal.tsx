"use client";

import { X, Printer } from "lucide-react";
import Receipt, { type ReceiptData } from "./Receipt";

export default function ReceiptModal({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:static print:bg-transparent print:p-0">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-xl print:max-h-none print:overflow-visible print:rounded-none print:p-0 print:shadow-none">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h3 className="font-serif text-lg text-[#2D5A27]">E-Receipt</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700">
            <X size={18} />
          </button>
        </div>

        <Receipt data={data} />

        <div className="mt-5 flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#2D5A27] py-2.5 text-sm font-medium text-[#F9F6F0]"
          >
            <Printer size={15} />
            Print
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-stone-300 px-5 py-2.5 text-sm text-stone-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
