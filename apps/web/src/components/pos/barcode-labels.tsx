import JsBarcode from "jsbarcode";
import { useEffect, useRef, useState } from "react";

import { tk } from "@/lib/money";

import { Btn, Field, Input, Modal } from "./ui";

type P = { id: number; name: string; strength: string | null; barcode: string | null; salePrice: number };

/** Shelf / packet labels (Code 128). Uses the product barcode, or an internal code "QSI{id}". */
export function BarcodeLabels({ product, onClose }: { product: P | null; onClose: () => void }) {
  const [count, setCount] = useState(12);
  const code = product ? product.barcode || `QSI${String(product.id).padStart(6, "0")}` : "";

  return (
    <Modal open={!!product} onClose={onClose} title="Print barcode labels" wide>
      {product && (
        <>
          {!product.barcode && (
            <p className="mb-4 rounded-lg bg-[#fffaeb] p-3 text-sm text-[#93370d]">
              This medicine has no manufacturer barcode. Labels use the internal code <b>{code}</b>. Save it as the product's
              barcode so scanning at the counter finds it.
            </p>
          )}
          <div className="mb-4 flex items-end gap-3 print:hidden">
            <Field label="Number of labels"><Input type="number" min={1} max={200} value={count} onChange={(e) => setCount(Math.max(1, Math.min(200, Number(e.target.value) || 1)))} className="w-28" /></Field>
            <Btn onClick={() => printLabels()}>Print labels</Btn>
          </div>
          <div id="label-sheet" className="grid grid-cols-3 gap-2">
            {Array.from({ length: count }, (_, i) => <Label key={i} code={code} product={product} />)}
          </div>
        </>
      )}
    </Modal>
  );
}

function Label({ code, product }: { code: string; product: P }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current) JsBarcode(ref.current, code, { format: "CODE128", height: 36, width: 1.4, fontSize: 11, margin: 0 });
  }, [code]);
  return (
    <div className="rounded border border-rule p-2 text-center text-[10px] leading-tight">
      <p className="truncate font-semibold">{product.name} {product.strength}</p>
      <svg ref={ref} className="mx-auto my-1 max-w-full" />
      <p className="font-semibold">{tk(product.salePrice)}</p>
    </div>
  );
}

function printLabels() {
  const sheet = document.getElementById("label-sheet");
  if (!sheet) return;
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.write(`<!doctype html><title>Labels</title><style>
    body{font-family:system-ui,sans-serif;margin:8mm}
    .g{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
    .g>div{border:1px dashed #bbb;padding:2mm;text-align:center;font-size:9pt;break-inside:avoid}
    svg{max-width:100%;height:auto} p{margin:0}
  </style><div class="g">${sheet.innerHTML}</div><script>onload=()=>{print();close()}<\/script>`);
  w.document.close();
}
