import { ArrowRight, Sparkles } from "lucide-react";
import { AppHeader } from "../components/app-header.js";
import { Button } from "../components/ui/button.js";
import type { Navigate } from "../routing.js";

export function HomePage({ navigate }: { navigate: Navigate }) {
  return (
    <main className="min-h-dvh overflow-hidden bg-paper">
      <AppHeader navigate={navigate} />
      <section className="relative grid min-h-[calc(100dvh-56px)] place-items-center overflow-hidden bg-[radial-gradient(#d3d7d0_0.65px,transparent_0.65px)] bg-size-[22px_22px] px-6 py-[54px] pb-[92px] before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-line before:opacity-40 after:absolute after:inset-x-0 after:top-[52%] after:h-px after:bg-line after:opacity-40">
        <div className="relative z-10 flex max-w-[760px] flex-col items-center text-center">
          <div
            className="mb-[30px] flex items-center gap-2.5 font-display text-[11px] text-[#959b93]"
            aria-hidden="true"
          >
            <span>W</span>
            <i className="h-px w-12 bg-[#b9beb7]" />
            <span>X</span>
          </div>
          <p className="mb-5 flex items-center gap-[7px] text-[11px] font-bold tracking-[0.1em] text-forest uppercase">
            <Sparkles size={14} /> AI 网站创作空间
          </p>
          <h1 className="font-display text-5xl leading-[1.07] font-normal sm:text-[64px] lg:text-[78px]">
            用对话构建你的站点
          </h1>
          <p className="mt-6 max-w-[500px] text-[15px] leading-[1.8] text-[#666d65]">
            从一个想法开始，和 Wex 一起把它变成可预览、可迭代的网站。
          </p>
          <Button
            className="mt-[34px] h-[46px] px-[21px]"
            type="button"
            onClick={() => navigate("/workspace")}
          >
            进入工作台 <ArrowRight size={17} />
          </Button>
        </div>
        <div
          className="absolute inset-x-4 bottom-[23px] flex justify-between font-mono text-[9px] tracking-[0.16em] text-[#9ca19a] sm:inset-x-8"
          aria-hidden="true"
        >
          <span>DESIGN</span>
          <span>BUILD</span>
          <span>ITERATE</span>
        </div>
      </section>
    </main>
  );
}
