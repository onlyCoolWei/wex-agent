import type { ProjectResponse } from "@wex/contracts";
import { LoaderCircle, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "./ui/button.js";

interface DeleteProjectDialogProps {
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  project: ProjectResponse | null;
}

export function DeleteProjectDialog({
  deleting,
  error,
  onCancel,
  onConfirm,
  project,
}: DeleteProjectDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (project && !dialog.open) dialog.showModal();
    if (!project && dialog.open) dialog.close();
  }, [project]);

  const cancel = () => {
    if (!deleting) onCancel();
  };

  return (
    <dialog
      ref={dialogRef}
      className="project-delete-dialog m-auto w-[calc(100%-32px)] max-w-[430px] rounded-[6px] border border-[#d8dbd4] bg-paper p-0 text-ink shadow-[0_24px_80px_rgba(25,30,25,0.28)]"
      aria-labelledby="delete-project-title"
      aria-describedby="delete-project-description"
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) cancel();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        cancel();
      }}
    >
      <div className="animate-appear p-5 sm:p-6">
        <div className="flex items-start justify-between gap-5">
          <div className="grid size-10 shrink-0 place-items-center rounded-[5px] bg-[#f9e9e7] text-danger">
            <Trash2 size={18} aria-hidden="true" />
          </div>
          <button
            type="button"
            className="grid size-8 shrink-0 place-items-center rounded-[4px] text-muted hover:bg-[#ecefe9] hover:text-ink disabled:opacity-50"
            onClick={cancel}
            disabled={deleting}
            aria-label="关闭删除确认"
            title="关闭"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
        <h2 id="delete-project-title" className="mt-4 font-display text-[24px] font-normal">
          删除项目？
        </h2>
        <p id="delete-project-description" className="mt-2 text-[13px] leading-6 text-muted">
          “{project?.name}”及其项目记录将被永久删除，此操作无法撤销。
        </p>
        {error && (
          <p
            className="mt-3 border-l-2 border-danger bg-[#fff8f7] px-3 py-2 text-[12px] text-danger"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={cancel} disabled={deleting} autoFocus>
            取消
          </Button>
          <Button variant="destructive" type="button" onClick={onConfirm} disabled={deleting}>
            {deleting ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={16} />}
            {deleting ? "正在删除" : "确认删除"}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
