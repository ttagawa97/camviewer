export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Tokyo"
  }).format(date);
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateKeyWithWeek(value: string) {
  const date = parseDateKey(value);
  if (!date) return value;
  const week = new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date);
  return `${value}(${week})`;
}

export function statusLabel(status?: string | null) {
  if (status === "success") return "正常";
  if (status === "failed") return "取得失敗";
  if (status === "not_yet") return "未取得";
  if (status === "active") return "有効";
  if (status === "inactive") return "停止";
  return "-";
}
