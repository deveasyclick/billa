export default function normalizeStatus(
  status: string,
): "success" | "pending" | "failed" {
  const s = status.toLowerCase();

  switch (s) {
    case "successful":
    case "success":
    case "delivered":
      return "success";
    case "pending":
      return "pending";
    case "failed":
      return "failed";
    default:
      throw new Error(`Unknown status: ${status}`);
  }
}
