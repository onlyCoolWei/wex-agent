import type { ArchitectureResponse, HealthResponse } from "@wex/contracts";
import {
  Box,
  Braces,
  Check,
  CircleDashed,
  Database,
  Layers3,
  Radio,
  ServerCog,
  TerminalSquare,
  Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";

const fallbackArchitecture: ArchitectureResponse = {
  name: "Wex Agent",
  phase: "Monorepo foundation",
  nodes: [
    { id: "web", label: "React Web", kind: "app", status: "ready" },
    { id: "api", label: "NestJS API", kind: "app", status: "ready" },
    { id: "worker", label: "Agent Worker", kind: "app", status: "ready" },
    {
      id: "runtime",
      label: "OpenAI Agent Runtime",
      kind: "package",
      status: "planned",
    },
    { id: "sandbox", label: "Sandbox", kind: "package", status: "ready" },
    {
      id: "supabase",
      label: "Supabase",
      kind: "infrastructure",
      status: "ready",
    },
    { id: "queue", label: "BullMQ + Redis", kind: "infrastructure", status: "planned" },
  ],
};

const nodeIcons = {
  web: Braces,
  api: ServerCog,
  worker: Workflow,
  runtime: TerminalSquare,
  sandbox: Box,
  supabase: Database,
  queue: Layers3,
};

export function App() {
  const [architecture, setArchitecture] = useState(fallbackArchitecture);
  const [apiHealth, setApiHealth] = useState<"checking" | "online" | "offline">(
    "checking",
  );

  useEffect(() => {
    Promise.all([
      fetch("/api/health").then((response) => response.json() as Promise<HealthResponse>),
      fetch("/api/architecture").then(
        (response) => response.json() as Promise<ArchitectureResponse>,
      ),
    ])
      .then(([health, response]) => {
        setApiHealth(health.status === "ok" ? "online" : "offline");
        setArchitecture(response);
      })
      .catch(() => setApiHealth("offline"));
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-mark">W</div>
        <div className="brand-copy">
          <strong>{architecture.name}</strong>
          <span>engineering runtime</span>
        </div>
        <div className={`connection connection--${apiHealth}`}>
          <Radio size={14} aria-hidden="true" />
          API {apiHealth}
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">FOUNDATION / PHASE 01</p>
          <h1>Runtime boundaries,<br />ready to evolve.</h1>
        </div>
        <p className="intro-copy">
          三个独立应用，共享稳定契约。当前骨架已将交互、编排与执行分开，
          后续能力可以沿清晰边界逐步接入。
        </p>
      </section>

      <section className="workspace" aria-label="Monorepo architecture">
        <div className="section-head">
          <div>
            <span className="section-index">01</span>
            <h2>System topology</h2>
          </div>
          <span className="phase-label">{architecture.phase}</span>
        </div>

        <div className="node-grid">
          {architecture.nodes.map((node, index) => {
            const Icon = nodeIcons[node.id as keyof typeof nodeIcons] ?? CircleDashed;
            return (
              <article className={`node node--${node.kind}`} key={node.id}>
                <div className="node-number">{String(index + 1).padStart(2, "0")}</div>
                <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
                <div className="node-copy">
                  <strong>{node.label}</strong>
                  <span>{node.kind}</span>
                </div>
                <div className={`status status--${node.status}`}>
                  {node.status === "ready" ? <Check size={12} /> : <CircleDashed size={12} />}
                  {node.status}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="footer">
        <span>apps → packages → infrastructure</span>
        <span>REST + SSE planned transport</span>
      </footer>
    </main>
  );
}
