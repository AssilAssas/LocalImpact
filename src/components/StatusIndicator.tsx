import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Wrench,
} from "lucide-react";
import { STATUS_LABELS, type ReportStatus } from "@/domain/types";

const STATUS_STYLES: Record<
  ReportStatus,
  { textClass: string; icon: typeof CircleAlert }
> = {
  NOUVEAU: {
    textClass: "text-amber-700",
    icon: CircleAlert,
  },
  PRIS_EN_CHARGE: {
    textClass: "text-sky-700",
    icon: Clock3,
  },
  EN_COURS: {
    textClass: "text-teal-700",
    icon: Wrench,
  },
  RESOLU: {
    textClass: "text-emerald-700",
    icon: CheckCircle2,
  },
};

export function StatusIndicator({ status }: { status: ReportStatus }) {
  const config = STATUS_STYLES[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${config.textClass}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{STATUS_LABELS[status]}</span>
    </span>
  );
}
