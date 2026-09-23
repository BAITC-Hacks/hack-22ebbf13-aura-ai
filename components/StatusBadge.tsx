import type { Status } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/labels";

const STYLE: Record<Status, string> = {
  collecting: "text-tape bg-tape/10",
  sent: "text-sent bg-sent/10",
  ignored: "text-ignored bg-ignored/10",
};
const DOT: Record<Status, string> = { collecting: "bg-tape", sent: "bg-sent", ignored: "bg-ignored" };

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[12px] font-medium ${STYLE[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} aria-hidden />
      {STATUS_LABELS[status].label}
    </span>
  );
}
