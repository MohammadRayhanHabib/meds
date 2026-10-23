import { router } from "../../index";
import { auditRouter } from "./audit";
import { customerRouter } from "./customer";
import { dashboardRouter } from "./dashboard";
import { expenseRouter } from "./expense";
import { productRouter } from "./product";
import { purchaseRouter } from "./purchase";
import { reportRouter } from "./report";
import { saleRouter } from "./sale";
import { staffRouter } from "./staff";
import { stockRouter } from "./stock";
import { supplierRouter } from "./supplier";

export const posRouter = router({
  dashboard: dashboardRouter,
  product: productRouter,
  supplier: supplierRouter,
  customer: customerRouter,
  purchase: purchaseRouter,
  sale: saleRouter,
  stock: stockRouter,
  expense: expenseRouter,
  report: reportRouter,
  staff: staffRouter,
  audit: auditRouter,
});
