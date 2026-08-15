import { ChevronRight, CircleUserRound } from "lucide-react";
import type { Navigate } from "../routing.js";

function Brand() {
  return (
    <span className="flex items-center gap-[9px] font-display text-[17px] font-semibold text-ink">
      <span
        className="grid size-[27px] place-items-center bg-ink text-[15px] text-[#f9faf6]"
        aria-hidden="true"
      >
        W
      </span>
      <span>Wex</span>
    </span>
  );
}

export function AppHeader({ page, navigate }: { page?: string; navigate: Navigate }) {
  return (
    <header className="h-14 border-b border-line bg-paper/90">
      <div className="mx-auto flex h-full w-full max-w-[1264px] items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-[9px] text-[13px] text-[#777d75]">
          <button onClick={() => navigate("/")} type="button" aria-label="返回首页">
            <Brand />
          </button>
          {page && (
            <>
              <ChevronRight size={14} aria-hidden="true" />
              <span>{page}</span>
            </>
          )}
        </div>
        <button
          className="relative grid size-9 place-items-center rounded-full border border-line bg-white hover:bg-[#f1f3ee]"
          type="button"
          aria-label="账户菜单"
          title="账户菜单"
        >
          <span
            className="absolute bottom-0.5 right-0.5 size-2 rounded-full border-2 border-white bg-[#65a776]"
            aria-hidden="true"
          />
          <CircleUserRound size={19} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
