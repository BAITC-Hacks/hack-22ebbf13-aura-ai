import { Armchair, Hourglass, ShieldAlert, UserX, type LucideProps } from "lucide-react";
import type { Category } from "@/lib/types";

const ICONS = { logistics: Hourglass, seating: Armchair, security: ShieldAlert, negligence: UserX } as const;

export function CategoryIcon({ category, ...props }: { category: Category } & LucideProps) {
  const Icon = ICONS[category];
  return <Icon aria-hidden {...props} />;
}
