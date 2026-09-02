export const viteReactTemplate: Record<string, string> = {
  "package.json": JSON.stringify(
    {
      private: true,
      type: "module",
      scripts: { dev: "vite", build: "vite build" },
      dependencies: {
        "@vitejs/plugin-react": "latest",
        vite: "latest",
        react: "latest",
        "react-dom": "latest",
      },
      devDependencies: {},
    },
    null,
    2,
  ),
  "index.html": '<div id="root"></div><script type="module" src="/src/main.jsx"></script>',
  "src/main.jsx": `import React from "react";\nimport { createRoot } from "react-dom/client";\nimport "./style.css";\n\nfunction App() {\n  return <main><h1>Wex Sandbox</h1><p>React + Vite is running in Docker.</p></main>;\n}\n\ncreateRoot(document.getElementById("root")).render(<App />);\n`,
  "src/style.css":
    "body{margin:0;font-family:system-ui;background:#f5f5f2;color:#222}main{max-width:680px;margin:15vh auto;padding:32px;background:white;border:1px solid #ddd}h1{margin-top:0}",
};
