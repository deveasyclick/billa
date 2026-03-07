import type { BillCategory } from "../types/vtpass";

export const isStaticCategory = (category: BillCategory) => {
  return (
    category === "AIRTIME" ||
    category === "ELECTRICITY" ||
    category === "GAMING"
  );
};

export const getStaticInternalCode = (
  billerName: string,
  category: BillCategory,
) => {
  return `${billerName} ${category}`.split(" ").join("-").toLowerCase();
};
