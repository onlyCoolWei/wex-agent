import type { ProjectResponse } from "@wex/contracts";
import {
  ArrowRight,
  ArrowUpRight,
  CircleAlert,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "../components/app-header.js";
import { DeleteProjectDialog } from "../components/delete-project-dialog.js";
import { Button } from "../components/ui/button.js";
import {
  createProject as requestProject,
  deleteProject as requestProjectDeletion,
  listProjects,
} from "../lib/api.js";
import type { Navigate } from "../routing.js";

const projectDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatProjectDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "时间未知" : projectDateFormatter.format(date);
}

export function WorkspacePage({ navigate }: { navigate: Navigate }) {
  const [projects, setProjects] = useState<ProjectResponse[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void listProjects(controller.signal)
      .then((result) => setProjects(result))
      .catch(() => {
        if (controller.signal.aborted) return;
        setProjects([]);
        setLoadError("项目列表加载失败，请检查网络连接后重试。");
      });

    return () => controller.abort();
  }, []);

  const refreshProjects = async () => {
    setProjects(null);
    setLoadError(null);

    try {
      setProjects(await listProjects());
    } catch {
      setProjects([]);
      setLoadError("项目列表加载失败，请检查网络连接后重试。");
    }
  };

  const createProject = async () => {
    if (creating) return;

    setCreating(true);
    setCreateError(null);

    try {
      const project = await requestProject();
      navigate(`/projects/${project.id}`);
    } catch {
      setCreateError("项目创建失败，请检查网络连接后重试。");
      setCreating(false);
    }
  };

  const openDeleteDialog = (project: ProjectResponse) => {
    setDeleteError(null);
    setDeleteTarget(project);
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteError(null);
    setDeleteTarget(null);
  };

  const deleteProject = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await requestProjectDeletion(deleteTarget.id);
      setProjects((current) => current?.filter((project) => project.id !== deleteTarget.id) ?? []);
      setDeleteTarget(null);
    } catch {
      setDeleteError("项目删除失败，请稍后重试。");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[#f7f8f5]">
      <AppHeader page="工作台" navigate={navigate} />
      <section className="mx-auto w-[calc(100%-32px)] max-w-300 py-10.5 sm:w-[calc(100%-64px)] sm:py-17.5">
        <div className="flex items-end justify-between gap-5 border-b border-line pb-[30px]">
          <div>
            <p className="mb-2.5 font-mono text-[9px] font-bold tracking-[0.16em] text-[#7c8479]">
              WORKSPACE
            </p>
            <h1 className="font-display text-[38px] font-normal">项目</h1>
            <p className="mt-2 text-[13px] text-muted">
              {projects ? `${projects.length} 个项目` : "正在同步项目"}
            </p>
          </div>
          <Button type="button" onClick={createProject} disabled={creating}>
            {creating ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}
            {creating ? "正在创建" : "创建项目"}
          </Button>
        </div>

        {createError && (
          <div
            className="mt-4 flex items-center gap-2 border-l-2 border-danger bg-[#fff8f7] px-3 py-2.5 text-[13px] text-danger"
            role="alert"
          >
            <CircleAlert size={16} aria-hidden="true" />
            <span>{createError}</span>
          </div>
        )}

        {loadError ? (
          <section
            className="flex min-h-[430px] flex-col items-center justify-center border-b border-line text-center"
            role="alert"
          >
            <div className="grid size-12 place-items-center rounded-[6px] border border-[#e1c4c0] bg-[#fff8f7] text-danger">
              <CircleAlert size={20} aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-[22px] font-normal">无法加载项目</h2>
            <p className="mb-5 mt-2 text-[13px] text-muted">{loadError}</p>
            <Button variant="outline" type="button" onClick={refreshProjects}>
              <RefreshCw size={16} />
              重新加载
            </Button>
          </section>
        ) : projects === null ? (
          <section
            className="grid min-h-[430px] grid-cols-1 gap-4 border-b border-line py-8 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="正在加载项目"
            aria-busy="true"
          >
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-[210px] animate-pulse rounded-[6px] border border-soft-line bg-white/60"
                aria-hidden="true"
              >
                <div className="h-[102px] border-b border-soft-line bg-[#eef0eb]" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-2/3 bg-[#e4e7e0]" />
                  <div className="h-3 w-1/2 bg-[#eceee9]" />
                </div>
              </div>
            ))}
            <span className="sr-only">正在加载项目</span>
          </section>
        ) : projects.length === 0 ? (
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
              <div className="absolute bottom-0 right-0 grid size-[27px] rotate-[-35deg] place-items-center rounded-full border border-[#afdc4e] bg-lime text-ink">
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
        ) : (
          <section
            className="grid grid-cols-1 gap-4 border-b border-line py-6 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="项目列表"
          >
            {projects.map((project) => (
              <article
                key={project.id}
                className="group relative min-h-[210px] overflow-hidden rounded-[6px] border border-[#d9ddd5] bg-white shadow-[0_3px_12px_rgba(32,35,31,0.04)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[#b7beb3] hover:shadow-[0_10px_26px_rgba(32,35,31,0.08)]"
              >
                <button
                  type="button"
                  className="block h-full w-full text-left focus-visible:outline-none"
                  onClick={() => navigate(`/projects/${project.id}`)}
                  aria-label={`打开项目 ${project.name}`}
                >
                  <div className="relative h-[106px] overflow-hidden border-b border-soft-line bg-[#eef0eb] px-4 pt-4">
                    <div className="h-full border border-[#d7dbd3] bg-paper shadow-[5px_5px_0_#e0e4dc]">
                      <div className="flex h-6 items-center gap-1 border-b border-soft-line px-2">
                        <i className="size-1 rounded-full bg-[#aeb5ac]" />
                        <i className="size-1 rounded-full bg-[#aeb5ac]" />
                        <i className="size-1 rounded-full bg-[#aeb5ac]" />
                      </div>
                      <div className="grid grid-cols-[35%_1fr] gap-2 p-2">
                        <i className="h-10 bg-[#dfe4da]" />
                        <span className="space-y-1.5 pt-1">
                          <i className="block h-1.5 w-4/5 bg-[#d7dbd3]" />
                          <i className="block h-1.5 w-3/5 bg-[#e4e7e1]" />
                          <i className="mt-2 block h-3 w-8 bg-lime" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 pr-12">
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-[#667064]">
                      <span className="size-1.5 rounded-full bg-[#7fa34a]" aria-hidden="true" />
                      {project.status === "active" ? "进行中" : "已归档"}
                    </div>
                    <h2 className="mt-2 break-words font-display text-[21px] font-normal leading-tight">
                      {project.name}
                    </h2>
                    <p className="mt-2 text-[11px] text-muted">
                      更新于 {formatProjectDate(project.updatedAt)}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="absolute bottom-4 right-4 text-[#8b9288] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    size={17}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-3 grid size-8 place-items-center rounded-[4px] border border-[#d7dbd3] bg-white/95 text-[#7a8177] shadow-sm transition-colors hover:border-[#e0b8b4] hover:bg-[#fff8f7] hover:text-danger focus-visible:outline-none"
                  onClick={() => openDeleteDialog(project)}
                  aria-label={`删除项目 ${project.name}`}
                  title="删除项目"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </article>
            ))}
          </section>
        )}
      </section>

      <DeleteProjectDialog
        deleting={deleting}
        error={deleteError}
        onCancel={closeDeleteDialog}
        onConfirm={deleteProject}
        project={deleteTarget}
      />
    </main>
  );
}
