import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if ([".git", "node_modules", "dist", ".turbo"].includes(entry.name)) return [];
    if (entry.isDirectory()) return markdownFiles(path);
    return extname(entry.name) === ".md" ? [path] : [];
  });
}

function checkLinks(file) {
  const source = readFileSync(file, "utf8");
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of source.matchAll(linkPattern)) {
    const target = match[1].trim().split(/[?#]/, 1)[0];
    if (
      !target ||
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("<http://") ||
      target.startsWith("<https://") ||
      target.startsWith("mailto:")
    )
      continue;
    const targetPath = resolve(file, "..", target);
    if (!existsSync(targetPath)) {
      errors.push(`${relative(root, file)}: broken link ${target}`);
    }
  }
}

for (const file of [
  ...readdirSync(root)
    .filter((entry) => entry.endsWith(".md"))
    .map((entry) => join(root, entry)),
  ...markdownFiles(join(root, "docs")),
])
  checkLinks(file);

const docsEntries = readdirSync(join(root, "docs"), { withFileTypes: true });
const allowedDocsDirectories = new Set(["adr", "business", "design", "technical"]);
for (const entry of docsEntries) {
  if (entry.isDirectory() && !allowedDocsDirectories.has(entry.name)) {
    errors.push(`docs/: unexpected directory ${entry.name}`);
  }
}

const moduleFiles = markdownFiles(join(root, "docs"));
for (const file of moduleFiles) {
  const source = readFileSync(file, "utf8");
  for (const field of ["Status:", "Last verified:", "Read when:", "Applies to:"]) {
    if (!source.includes(field)) errors.push(`${relative(root, file)}: missing ${field}`);
  }
  if (!source.includes("## Related")) errors.push(`${relative(root, file)}: missing ## Related`);
}

if (existsSync(join(root, "docs", "design"))) {
  const index = readFileSync(join(root, "docs", "design", "README.md"), "utf8");
  for (const file of readdirSync(join(root, "docs", "design"))) {
    if (file !== "README.md" && !index.includes(`(${file})`)) {
      errors.push(`docs/design/README.md: missing index entry for ${file}`);
    }
  }
}

const businessDirectory = join(root, "docs", "business");
for (const file of readdirSync(businessDirectory)) {
  if (file === "README.md" || extname(file) !== ".md") continue;

  const businessSource = readFileSync(join(businessDirectory, file), "utf8");
  const businessTitle = businessSource.match(/^# (.+)$/m)?.[1];
  for (const category of ["design", "technical"]) {
    const counterpart = join(root, "docs", category, file);
    if (!existsSync(counterpart)) continue;

    const counterpartSource = readFileSync(counterpart, "utf8");
    const counterpartTitle = counterpartSource.match(/^# (.+)$/m)?.[1];
    if (counterpartTitle !== businessTitle) {
      errors.push(
        `docs/${category}/${file}: title must match docs/business/${file} (${businessTitle})`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Documentation checks passed.");
}
