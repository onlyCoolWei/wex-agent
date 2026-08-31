import { cn } from "../lib/utils.js";

export function Brand({
  className,
  logoClassName,
}: {
  className?: string;
  logoClassName?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-[9px] font-display text-[17px] font-semibold",
        className,
      )}
    >
      <img
        className={cn("size-[27px] shrink-0 object-cover", logoClassName)}
        src="/wex-logo.png"
        alt=""
        aria-hidden="true"
      />
      <span>Wex</span>
    </span>
  );
}
