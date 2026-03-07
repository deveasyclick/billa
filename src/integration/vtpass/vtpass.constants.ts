import type { BillCategory } from "../../common/types/vtpass";

interface ProviderInfo {
  name: "VTPASS" | "INTERSWITCH";
  billerId: string;
}

interface StaticBillItem {
  category: BillCategory;
  name: string;
  providers: ProviderInfo[];
  image?: string;
}

export const STATIC_BILL_ITEMS: StaticBillItem[] = [
  {
    category: "AIRTIME",
    name: "MTN",
    providers: [{ name: "VTPASS", billerId: "mtn" }],
  },
  {
    category: "AIRTIME",
    name: "GLO",
    providers: [{ name: "VTPASS", billerId: "glo" }],
  },
  {
    category: "AIRTIME",
    name: "AIRTEL",
    providers: [{ name: "VTPASS", billerId: "airtel" }],
  },
  {
    category: "AIRTIME",
    name: "9MOBILE",
    providers: [{ name: "VTPASS", billerId: "etisalat" }],
  },
  {
    category: "DATA",
    name: "MTN",
    providers: [{ name: "VTPASS", billerId: "mtn-data" }],
  },
  {
    category: "DATA",
    name: "GLO",
    providers: [{ name: "VTPASS", billerId: "glo-data" }],
  },
  {
    category: "DATA",
    name: "AIRTEL",
    providers: [{ name: "VTPASS", billerId: "airtel-data" }],
  },
  {
    category: "DATA",
    name: "9MOBILE",
    providers: [{ name: "VTPASS", billerId: "etisalat-data" }],
  },
  {
    category: "DATA",
    name: "SPECTRANET",
    providers: [{ name: "VTPASS", billerId: "spectranet" }],
  },
  {
    category: "DATA",
    name: "SMILE",
    providers: [{ name: "VTPASS", billerId: "smile-direct" }],
  },
  {
    category: "TV",
    name: "DSTV",
    providers: [{ name: "VTPASS", billerId: "dstv" }],
  },
  {
    category: "TV",
    name: "GOTV",
    providers: [{ name: "VTPASS", billerId: "gotv" }],
  },
  {
    category: "TV",
    name: "STARTIMES",
    providers: [{ name: "VTPASS", billerId: "startimes" }],
  },
  {
    category: "TV",
    name: "SHOWMAX",
    providers: [{ name: "VTPASS", billerId: "showmax" }],
  },
  {
    category: "ELECTRICITY",
    name: "Ikeja Electric",
    image:
      "https://sandbox.vtpass.com/resources/products/200X200/Ikeja-Electric-Payment-PHCN.jpg",
    providers: [{ name: "VTPASS", billerId: "ikeja-electric" }],
  },
  {
    category: "ELECTRICITY",
    name: "Eko Electric",
    image:
      "https://sandbox.vtpass.com/resources/products/200X200/Eko-Electric-Payment-PHCN.jpg",
    providers: [{ name: "VTPASS", billerId: "eko-electric" }],
  },
  {
    category: "ELECTRICITY",
    name: "Abuja Electric",
    image:
      "https://sandbox.vtpass.com/resources/products/200X200/Abuja-Electric.jpg",
    providers: [{ name: "VTPASS", billerId: "abuja-electric" }],
  },
  {
    category: "ELECTRICITY",
    name: "Kano Electric",
    image:
      "https://sandbox.vtpass.com/resources/products/200X200/Kano-Electric.jpg",
    providers: [{ name: "VTPASS", billerId: "kano-electric" }],
  },
  {
    category: "ELECTRICITY",
    name: "Portharcourt Electric",
    image:
      "https://sandbox.vtpass.com/resources/products/200X200/Port-Harcourt-Electric.jpg",
    providers: [{ name: "VTPASS", billerId: "portharcourt-electric" }],
  },
  {
    category: "ELECTRICITY",
    name: "Jos Electric",
    image:
      "https://sandbox.vtpass.com/resources/products/200X200/Jos-Electric-JED.jpg",
    providers: [{ name: "VTPASS", billerId: "jos-electric" }],
  },
  {
    category: "ELECTRICITY",
    name: "Kaduna Electric",
    image:
      "https://sandbox.vtpass.com/resources/products/200X200/Kaduna-Electric-KAEDCO.jpg",
    providers: [{ name: "VTPASS", billerId: "kaduna-electric" }],
  },
  {
    category: "ELECTRICITY",
    name: "Enugu Electric",
    image:
      "https://sandbox.vtpass.com/resources/products/200X200/Enugu-Electric-EEDC.jpg",
    providers: [{ name: "VTPASS", billerId: "enugu-electric" }],
  },
  {
    category: "ELECTRICITY",
    name: "Ibadan Electric",
    image: "",
    providers: [{ name: "VTPASS", billerId: "ibadan-electric" }],
  },
  {
    category: "ELECTRICITY",
    name: "Benin Electric",
    image:
      "https://sandbox.vtpass.com/resources/products/200X200/Benin-Electricity-BEDC.jpg",
    providers: [{ name: "VTPASS", billerId: "benin-electric" }],
  },
  {
    category: "ELECTRICITY",
    name: "Aba Electric",
    image:
      "https://sandbox.vtpass.com/resources/products/200X200/Aba-Electric-Payment-ABEDC.jpg",
    providers: [{ name: "VTPASS", billerId: "aba-electric" }],
  },
  {
    category: "ELECTRICITY",
    name: "Yola Electric",
    image:
      "https://sandbox.vtpass.com/resources/products/200X200/Yola-Electric-Payment-IKEDC.jpg",
    providers: [{ name: "VTPASS", billerId: "yola-electric" }],
  },
];
