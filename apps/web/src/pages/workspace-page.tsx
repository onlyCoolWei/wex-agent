import { ArrowRight, LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import { AppHeader } from "../components/app-header.js";
import { Button } from "../components/ui/button.js";
import type { Navigate } from "../routing.js";

export function WorkspacePage({ navigate }: { navigate: Navigate }) {
  const [creating, setCreating] = useState(false);
  const createProject = () => {
    if (!creating) {
      setCreating(true);
      window.setTimeout(() => navigate(`/projects/${crypto.randomUUID()}`), 650);
    }
  };

  return (
    <main className="min-h-dvh bg-[#f7f8f5]">
      <AppHeader page="工作台" navigate={navigate} />
      <section className="mx-auto w-[calc(100%-32px)] max-w-300 py-10.5 sm:w-[calc(100%-64px)] sm:py-17.5">
        <div className="flex items-end justify-between border-b border-line pb-[30px]">
          <div>
            <p className="mb-2.5 font-mono text-[9px] font-bold tracking-[0.16em] text-[#7c8479]">
              WORKSPACE
            </p>
            <h1 className="font-display text-[38px] font-normal">项目</h1>
            <p className="mt-2 text-[13px] text-muted">管理你创建的网站</p>
          </div>
          <Button type="button" onClick={createProject} disabled={creating}>
            {creating ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}
            {creating ? "正在创建" : "创建项目"}
          </Button>
        </div>
        <section
          className="flex min-h-[430px] flex-col items-center justify-center border-b border-line text-center"
          aria-labelledby="empty-title"
        >
          <div className="relative mb-[25px] size-[118px]" aria-hidden="true">
            <div className="absolute left-1.5 top-1 size-[102px] border border-[#bfc5bc] bg-white p-[11px] shadow-[9px_9px_0_#e5e8e1]">
              <div className="flex gap-1">
                <i className="size-1 rounded-full bg-[#aeb5ac]" />
                <i className="size-1 rounded-full bg-[#aeb5ac]" />
                <i className="size-1 rounded-full bg-[#aeb5ac]" />
              </div>
              <i className="mx-auto mt-4 block h-[25px] w-[58px] bg-[repeating-linear-gradient(135deg,#e7eae4_0_5px,#f6f7f4_5px_10px)]" />
            </div>
            <div className="absolute bottom-0 right-0 grid size-[27px] place-items-center rounded-full border border-[#afdc4e] bg-lime text-ink rotate-[-35deg]">
              <ArrowRight size={14} />
            </div>
          </div>
          <h2 id="empty-title" className="font-display text-[23px] font-normal">
            从第一个想法开始
          </h2>
          <p className="mb-[22px] mt-[9px] text-[13px] text-muted">你创建的项目会出现在这里。</p>
          <Button variant="outline" type="button" onClick={createProject} disabled={creating}>
            {creating ? <LoaderCircle className="animate-spin" size={16} /> : <Plus size={16} />}
            {creating ? "正在准备工作区" : "创建第一个项目"}
          </Button>
        </section>
      </section>
    </main>
  );
}
