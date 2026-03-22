export type BillerItem = {
  internalCode?: string;
  category: string;
  billerName: string; // e.g mtn | dstv
  provider: "INTERSWITCH" | "VTPASS";
  billerId: string; // service id in vtpass
  paymentCode: string;
  name: string; // "MTN 500" or "DSTV YANGA"
  amount: number;
  amountType: number;
  active: boolean;
  image?: string;
  requiresValidation: boolean;
};
