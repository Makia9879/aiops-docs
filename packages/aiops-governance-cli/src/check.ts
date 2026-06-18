import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { listWorkspaceHookTemplates } from "./hooks/workspace-hooks.js";
import { discoverWorkspaceRoot } from "./workspace.js";

export type CheckStatus = "ok" | "warning" | "error";

export interface CheckIssue {
  status: Exclude<CheckStatus, "ok">;
  code: string;
  message: string;
  path?: string;
}

export interface DocumentCheckResult {
  workspaceRoot: string;
  aiopsRoot: string;
  status: CheckStatus;
  checkedProjects: string[];
  issues: CheckIssue[];
}

export interface DocumentCheckOptions {
  cwd: string;
  project?: string;
}

interface ProjectShape {
  products: Array<{
    id: string;
    services: string[];
  }>;
}

export async function checkDocuments(
  options: DocumentCheckOptions
): Promise<DocumentCheckResult> {
  const workspaceRoot = await discoverWorkspaceRoot(options.cwd);
  const aiopsRoot = path.join(workspaceRoot, ".aiops");
  const issues: CheckIssue[] = [];

  if (!(await exists(aiopsRoot))) {
    return {
      workspaceRoot,
      aiopsRoot,
      status: "error",
      checkedProjects: [],
      issues: [
        {
          status: "error",
          code: "missing-aiops-root",
          message: "AIOps governance root is missing. Run aiops init or aiops setup first.",
          path: aiopsRoot
        }
      ]
    };
  }

  await requireFile(path.join(aiopsRoot, "governance.yaml"), issues, "missing-governance");
  await requireDir(path.join(aiopsRoot, "projects"), issues, "missing-projects-root");
  await checkWorkspaceHooks(workspaceRoot, issues);

  const governanceText = await readOptional(path.join(aiopsRoot, "governance.yaml"));
  const projects = await resolveProjects(aiopsRoot, governanceText, options.project, issues);

  for (const projectId of projects) {
    await checkProject(aiopsRoot, projectId, issues);
  }

  return {
    workspaceRoot,
    aiopsRoot,
    status: issues.some((issue) => issue.status === "error")
      ? "error"
      : issues.length > 0
        ? "warning"
        : "ok",
    checkedProjects: projects,
    issues
  };
}

async function checkWorkspaceHooks(workspaceRoot: string, issues: CheckIssue[]): Promise<void> {
  for (const template of listWorkspaceHookTemplates()) {
    await requireFile(
      path.join(workspaceRoot, template.relativePath),
      issues,
      "missing-workspace-hook"
    );
  }
}

async function resolveProjects(
  aiopsRoot: string,
  governanceText: string | null,
  projectOption: string | undefined,
  issues: CheckIssue[]
): Promise<string[]> {
  if (projectOption?.trim()) {
    return [projectOption.trim()];
  }

  const projectsFromGovernance = governanceText ? parseGovernanceProjects(governanceText) : [];
  if (projectsFromGovernance.length > 0) {
    return projectsFromGovernance;
  }

  const projectsRoot = path.join(aiopsRoot, "projects");
  const projectDirs = await listDirectories(projectsRoot);
  if (projectDirs.length > 0) {
    issues.push({
      status: "warning",
      code: "missing-governance-project-list",
      message: "governance.yaml does not list projects; falling back to .aiops/projects directories.",
      path: path.join(aiopsRoot, "governance.yaml")
    });
    return projectDirs;
  }

  issues.push({
    status: "error",
    code: "missing-project-registration",
    message: "No projects are registered in governance.yaml or .aiops/projects.",
    path: projectsRoot
  });
  return [];
}

async function checkProject(
  aiopsRoot: string,
  projectId: string,
  issues: CheckIssue[]
): Promise<void> {
  const projectRoot = path.join(aiopsRoot, "projects", projectId);
  await requireDir(projectRoot, issues, "missing-project-root");
  await requireFile(path.join(projectRoot, "project.yaml"), issues, "missing-project-yaml");
  await requireFile(
    path.join(projectRoot, "iteration-bindings.yaml"),
    issues,
    "missing-iteration-bindings"
  );
  await requireFile(path.join(projectRoot, "README.md"), issues, "missing-project-readme");
  await requireFile(path.join(projectRoot, "open-questions.md"), issues, "missing-open-questions");
  await requireFile(path.join(projectRoot, "commit-analysis.md"), issues, "missing-commit-analysis");

  const projectYaml = await readOptional(path.join(projectRoot, "project.yaml"));
  const iterationBindings = await readOptional(path.join(projectRoot, "iteration-bindings.yaml"));
  const shape = parseProjectShape(projectYaml ?? "");
  const iterations = parseIterationIds(iterationBindings ?? "");

  if (shape.products.length === 0) {
    issues.push({
      status: "error",
      code: "missing-products",
      message: `Project ${projectId} does not define products in project.yaml.`,
      path: path.join(projectRoot, "project.yaml")
    });
  }

  if (iterations.length === 0) {
    issues.push({
      status: "error",
      code: "missing-iterations",
      message: `Project ${projectId} does not define iterations in iteration-bindings.yaml.`,
      path: path.join(projectRoot, "iteration-bindings.yaml")
    });
  }

  for (const iteration of iterations) {
    await checkIteration(projectRoot, iteration, issues);
  }

  for (const product of shape.products) {
    await checkProduct(projectRoot, product.id, product.services, issues);
  }

  await checkGuides(projectRoot, issues);
}

async function checkIteration(
  projectRoot: string,
  iteration: string,
  issues: CheckIssue[]
): Promise<void> {
  const iterationRoot = path.join(projectRoot, "iterations", iteration);
  await requireDir(iterationRoot, issues, "missing-iteration-root");
  for (const file of ["iteration.yaml", "prd.md", "architecture.md", "release-scope.md", "risks.md"]) {
    await requireFile(path.join(iterationRoot, file), issues, "missing-iteration-file");
  }
}

async function checkProduct(
  projectRoot: string,
  productId: string,
  services: string[],
  issues: CheckIssue[]
): Promise<void> {
  const productRoot = path.join(projectRoot, "products", productId);
  await requireDir(productRoot, issues, "missing-product-root");
  await requireFile(path.join(productRoot, "product.yaml"), issues, "missing-product-yaml");

  for (const category of ["prd", "architecture", "specs", "adr", "workflows"]) {
    await requireFile(
      path.join(productRoot, category, "README.md"),
      issues,
      "missing-product-category-readme"
    );
  }

  if (services.length === 0) {
    issues.push({
      status: "warning",
      code: "missing-product-services",
      message: `Product ${productId} does not list services in project.yaml.`,
      path: path.join(projectRoot, "project.yaml")
    });
  }

  for (const serviceId of services) {
    await checkService(productRoot, serviceId, issues);
  }
}

async function checkService(
  productRoot: string,
  serviceId: string,
  issues: CheckIssue[]
): Promise<void> {
  const serviceRoot = path.join(productRoot, "services", serviceId);
  await requireDir(serviceRoot, issues, "missing-service-root");
  await requireFile(path.join(serviceRoot, "service.yaml"), issues, "missing-service-yaml");
  for (const category of ["architecture", "specs", "adr", "workflows"]) {
    await requireFile(
      path.join(serviceRoot, category, "README.md"),
      issues,
      "missing-service-category-readme"
    );
  }
}

async function checkGuides(projectRoot: string, issues: CheckIssue[]): Promise<void> {
  const guidesRoot = path.join(projectRoot, "guides");
  await requireFile(path.join(guidesRoot, "package.json"), issues, "missing-guides-package");
  await requireFile(path.join(guidesRoot, "docker-compose.yaml"), issues, "missing-guides-compose");
  for (const file of ["README.md", "overview.md", "onboarding.md", "change-playbook.md"]) {
    await requireFile(path.join(guidesRoot, "docs", file), issues, "missing-guides-page");
  }
  await requireFile(
    path.join(guidesRoot, "docs", ".vuepress", "config.ts"),
    issues,
    "missing-guides-config"
  );
}

async function requireFile(target: string, issues: CheckIssue[], code: string): Promise<void> {
  if (await exists(target)) {
    return;
  }

  issues.push({
    status: "error",
    code,
    message: `Missing required file: ${target}`,
    path: target
  });
}

async function requireDir(target: string, issues: CheckIssue[], code: string): Promise<void> {
  if (await exists(target)) {
    return;
  }

  issues.push({
    status: "error",
    code,
    message: `Missing required directory: ${target}`,
    path: target
  });
}

function parseGovernanceProjects(content: string): string[] {
  const projects: string[] = [];
  let inProjects = false;

  for (const line of content.split(/\r?\n/)) {
    if (line.trim() === "projects:") {
      inProjects = true;
      continue;
    }

    if (inProjects && /^\S/.test(line)) {
      break;
    }

    const item = inProjects ? parseYamlListItem(line) : null;
    if (item) {
      projects.push(item);
    }
  }

  return unique(projects);
}

function parseProjectShape(content: string): ProjectShape {
  const products: ProjectShape["products"] = [];
  let currentProduct: ProjectShape["products"][number] | null = null;
  let inProducts = false;
  let inServices = false;

  for (const line of content.split(/\r?\n/)) {
    if (line.trim() === "products:") {
      inProducts = true;
      continue;
    }

    if (inProducts && /^\S/.test(line)) {
      break;
    }

    if (!inProducts) {
      continue;
    }

    const productMatch = /^  - id:\s*(.+?)\s*$/.exec(line);
    if (productMatch) {
      currentProduct = {
        id: cleanYamlScalar(productMatch[1]),
        services: []
      };
      products.push(currentProduct);
      inServices = false;
      continue;
    }

    if (/^    services:\s*$/.test(line)) {
      inServices = true;
      continue;
    }

    if (inServices && currentProduct) {
      const service = parseYamlListItem(line);
      if (service) {
        currentProduct.services.push(service);
      }
    }
  }

  return {
    products: products.map((product) => ({
      id: product.id,
      services: unique(product.services)
    }))
  };
}

function parseIterationIds(content: string): string[] {
  const iterations: string[] = [];
  let inIterations = false;

  for (const line of content.split(/\r?\n/)) {
    if (line.trim() === "iterations:") {
      inIterations = true;
      continue;
    }

    if (inIterations && /^\S/.test(line)) {
      break;
    }

    const match = /^  - id:\s*(.+?)\s*$/.exec(line);
    if (inIterations && match) {
      iterations.push(cleanYamlScalar(match[1]));
    }
  }

  return unique(iterations);
}

function parseYamlListItem(line: string): string | null {
  const match = /^\s*-\s*(.+?)\s*$/.exec(line);
  return match ? cleanYamlScalar(match[1]) : null;
}

function cleanYamlScalar(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function listDirectories(target: string): Promise<string[]> {
  try {
    const entries = await readdir(target, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

async function readOptional(target: string): Promise<string | null> {
  try {
    return await readFile(target, "utf8");
  } catch {
    return null;
  }
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
