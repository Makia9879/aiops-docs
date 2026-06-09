import { execFile, spawn } from "node:child_process";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { platform } from "node:os";
import { promisify } from "node:util";
import { discoverWorkspaceRoot } from "./workspace.js";

const execFileAsync = promisify(execFile);

export interface ConfigUiOptions {
  cwd: string;
  project?: string;
  host: string;
  port?: number;
  open: boolean;
  readOnly: boolean;
}

interface ProjectConfig {
  project: string;
  products: ProjectProduct[];
}

interface ProjectProduct {
  id: string;
  name: string;
  path: string;
  services: string[];
}

interface IterationBindings {
  schema_version: 1;
  project: string;
  iterations: BindingIteration[];
}

interface BindingIteration {
  id: string;
  docs_branch: string;
  docs_path: string;
  products: BindingProduct[];
}

interface BindingProduct {
  id: string;
  version: string;
  docs_path: string;
  services: BindingService[];
}

interface BindingService {
  id: string;
  code_root: string;
  required_branch: string;
}

interface BranchStatus {
  current_branch: string;
  status: "match" | "mismatch" | "missing" | "unknown";
  message: string;
}

interface ConfigUiState {
  workspaceRoot: string;
  aiopsRoot: string;
  projectRoot: string;
  readOnly: boolean;
  projectConfig: ProjectConfig;
  binding: IterationBindings;
  preview: string;
  branches: Record<string, BranchStatus>;
}

export async function runConfigUi(options: ConfigUiOptions): Promise<void> {
  const workspaceRoot = await discoverWorkspaceRoot(options.cwd);
  const aiopsRoot = path.join(workspaceRoot, ".aiops");
  const projectId = await resolveProjectId(aiopsRoot, options.project);
  const projectRoot = path.join(aiopsRoot, "projects", projectId);
  const projectConfig = await readProjectConfig(projectRoot, projectId);
  const bindingPath = path.join(projectRoot, "iteration-bindings.yaml");

  if (!(await exists(bindingPath)) && !options.readOnly) {
    const defaultBinding = createDefaultBinding(projectConfig, options.cwd);
    await writeFile(bindingPath, serializeIterationBindings(defaultBinding), "utf8");
  }

  const server = createServer((request, response) => {
    void handleRequest(request, response, {
      workspaceRoot,
      aiopsRoot,
      projectRoot,
      readOnly: options.readOnly,
      projectConfig
    }).catch((error: unknown) => {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : String(error)
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, options.host, () => resolve());
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : options.port;
  const url = `http://${options.host}:${actualPort}/`;
  console.log(`AIOps config UI: ${url}`);
  console.log(`Project: ${projectId}`);
  console.log(`Read only: ${options.readOnly ? "yes" : "no"}`);

  if (options.open) {
    openBrowser(url);
  }
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  context: {
    workspaceRoot: string;
    aiopsRoot: string;
    projectRoot: string;
    readOnly: boolean;
    projectConfig: ProjectConfig;
  }
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");

  if (request.method === "GET" && url.pathname === "/") {
    sendHtml(response, renderPage());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/config") {
    const state = await loadState(context);
    sendJson(response, 200, state);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/save") {
    if (context.readOnly) {
      sendJson(response, 403, { error: "config-ui is read-only" });
      return;
    }

    const body = await readJsonBody(request);
    const binding = coerceBinding(body, context.projectConfig.project);
    const issues = await validateBinding(binding, context.projectConfig, context.projectRoot);
    if (issues.length > 0) {
      sendJson(response, 400, { error: issues.join("\n") });
      return;
    }

    const filled = await saveBinding(context.projectRoot, context.projectConfig, binding);
    const state = await loadState(context);
    sendJson(response, 200, { ...state, filled });
    return;
  }

  sendJson(response, 404, { error: "not found" });
}

async function loadState(context: {
  workspaceRoot: string;
  aiopsRoot: string;
  projectRoot: string;
  readOnly: boolean;
  projectConfig: ProjectConfig;
}): Promise<ConfigUiState> {
  const binding = normalizeBindingToProject(
    await readIterationBindings(context.projectRoot, context.projectConfig),
    context.projectConfig,
    context.projectRoot
  );
  const preview = serializeIterationBindings(binding);
  const branches = await collectBranchStatuses(binding, context.projectRoot);

  return {
    workspaceRoot: context.workspaceRoot,
    aiopsRoot: context.aiopsRoot,
    projectRoot: context.projectRoot,
    readOnly: context.readOnly,
    projectConfig: context.projectConfig,
    binding,
    preview,
    branches
  };
}

async function resolveProjectId(aiopsRoot: string, explicit: string | undefined): Promise<string> {
  if (explicit?.trim()) {
    return explicit.trim();
  }

  const projectsRoot = path.join(aiopsRoot, "projects");
  const entries = await readdir(projectsRoot, { withFileTypes: true }).catch(() => []);
  const projects = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  if (projects.length === 1) {
    return projects[0];
  }

  if (projects.length === 0) {
    throw new Error("No projects found under .aiops/projects. Run init first.");
  }

  throw new Error(`Multiple projects found (${projects.join(", ")}). Pass --project <id>.`);
}

async function readProjectConfig(projectRoot: string, fallbackProject: string): Promise<ProjectConfig> {
  const target = path.join(projectRoot, "project.yaml");
  const raw = await readFile(target, "utf8");
  return parseProjectConfig(raw, fallbackProject);
}

async function readIterationBindings(
  projectRoot: string,
  projectConfig: ProjectConfig
): Promise<IterationBindings> {
  const target = path.join(projectRoot, "iteration-bindings.yaml");
  if (!(await exists(target))) {
    return createDefaultBinding(projectConfig, projectRoot);
  }

  const raw = await readFile(target, "utf8");
  const parsed = parseIterationBindings(raw, projectConfig.project);
  return parsed.iterations.length > 0 ? parsed : createDefaultBinding(projectConfig, projectRoot);
}

function parseProjectConfig(raw: string, fallbackProject: string): ProjectConfig {
  let project = fallbackProject;
  const products: ProjectProduct[] = [];
  let currentProduct: ProjectProduct | undefined;
  let inProducts = false;
  let inServices = false;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const scalar = parseScalar(line);
    if (scalar?.key === "project") {
      project = scalar.value || fallbackProject;
      continue;
    }

    if (trimmed === "products:") {
      inProducts = true;
      inServices = false;
      continue;
    }

    if (!inProducts) {
      continue;
    }

    if (/^\s{2}-\s+id\s*:/.test(line)) {
      currentProduct = {
        id: valueAfterColon(line),
        name: valueAfterColon(line),
        path: "",
        services: []
      };
      products.push(currentProduct);
      inServices = false;
      continue;
    }

    if (!currentProduct) {
      continue;
    }

    if (/^\s{4}name\s*:/.test(line)) {
      currentProduct.name = valueAfterColon(line);
      continue;
    }

    if (/^\s{4}path\s*:/.test(line)) {
      currentProduct.path = valueAfterColon(line);
      continue;
    }

    if (/^\s{4}services\s*:/.test(line)) {
      inServices = true;
      continue;
    }

    if (inServices && /^\s{6}-\s+/.test(line)) {
      currentProduct.services.push(unquoteYaml(line.replace(/^\s{6}-\s+/, "")));
    }
  }

  if (products.length === 0) {
    products.push({
      id: "core",
      name: "core",
      path: "products/core",
      services: ["core-service"]
    });
  }

  for (const product of products) {
    if (!product.path) {
      product.path = `products/${product.id}`;
    }
    if (product.services.length === 0) {
      product.services.push(`${product.id}-service`);
    }
  }

  return { project, products };
}

function parseIterationBindings(raw: string, fallbackProject: string): IterationBindings {
  const binding: IterationBindings = {
    schema_version: 1,
    project: fallbackProject,
    iterations: []
  };
  let currentIteration: BindingIteration | undefined;
  let currentProduct: BindingProduct | undefined;
  let currentService: BindingService | undefined;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const scalar = parseScalar(line);
    if (scalar?.key === "project") {
      binding.project = scalar.value || fallbackProject;
      continue;
    }

    if (/^\s{2}-\s+id\s*:/.test(line)) {
      const id = valueAfterColon(line);
      currentIteration = {
        id,
        docs_branch: "main",
        docs_path: `iterations/${id}`,
        products: []
      };
      binding.iterations.push(currentIteration);
      currentProduct = undefined;
      currentService = undefined;
      continue;
    }

    if (currentIteration && /^\s{4}docs_branch\s*:/.test(line)) {
      currentIteration.docs_branch = valueAfterColon(line);
      continue;
    }

    if (currentIteration && /^\s{4}docs_path\s*:/.test(line)) {
      currentIteration.docs_path = valueAfterColon(line);
      continue;
    }

    if (currentIteration && /^\s{6}-\s+id\s*:/.test(line)) {
      const id = valueAfterColon(line);
      currentProduct = {
        id,
        version: currentIteration.id,
        docs_path: `products/${id}`,
        services: []
      };
      currentIteration.products.push(currentProduct);
      currentService = undefined;
      continue;
    }

    if (currentProduct && /^\s{8}version\s*:/.test(line)) {
      currentProduct.version = valueAfterColon(line);
      continue;
    }

    if (currentProduct && /^\s{8}docs_path\s*:/.test(line)) {
      currentProduct.docs_path = valueAfterColon(line);
      continue;
    }

    if (currentProduct && /^\s{10}-\s+id\s*:/.test(line)) {
      currentService = {
        id: valueAfterColon(line),
        code_root: "",
        required_branch: "main"
      };
      currentProduct.services.push(currentService);
      continue;
    }

    if (currentService && /^\s{12}code_root\s*:/.test(line)) {
      currentService.code_root = valueAfterColon(line);
      continue;
    }

    if (currentService && /^\s{12}required_branch\s*:/.test(line)) {
      currentService.required_branch = valueAfterColon(line);
    }
  }

  return binding;
}

function normalizeBindingToProject(
  binding: IterationBindings,
  projectConfig: ProjectConfig,
  projectRoot: string
): IterationBindings {
  const normalized: IterationBindings = {
    schema_version: 1,
    project: projectConfig.project,
    iterations: binding.iterations.length > 0
      ? binding.iterations
      : createDefaultBinding(projectConfig, projectRoot).iterations
  };

  for (const iteration of normalized.iterations) {
    const existingProducts = new Map(iteration.products.map((product) => [product.id, product]));
    iteration.products = projectConfig.products.map((productConfig) => {
      const existing = existingProducts.get(productConfig.id);
      const serviceMap = new Map(existing?.services.map((service) => [service.id, service]) ?? []);
      return {
        id: productConfig.id,
        version: existing?.version || iteration.id,
        docs_path: existing?.docs_path || productConfig.path,
        services: productConfig.services.map((serviceId) => {
          const existingService = serviceMap.get(serviceId);
          return {
            id: serviceId,
            code_root: existingService?.code_root || projectRoot,
            required_branch: existingService?.required_branch || iteration.docs_branch || "main"
          };
        })
      };
    });
  }

  return normalized;
}

function createDefaultBinding(projectConfig: ProjectConfig, codeRoot: string): IterationBindings {
  return {
    schema_version: 1,
    project: projectConfig.project,
    iterations: [
      {
        id: "current",
        docs_branch: "main",
        docs_path: "iterations/current",
        products: projectConfig.products.map((product) => ({
          id: product.id,
          version: "current",
          docs_path: product.path,
          services: product.services.map((service) => ({
            id: service,
            code_root: codeRoot,
            required_branch: "main"
          }))
        }))
      }
    ]
  };
}

async function validateBinding(
  binding: IterationBindings,
  projectConfig: ProjectConfig,
  projectRoot: string
): Promise<string[]> {
  const issues: string[] = [];
  if (binding.project !== projectConfig.project) {
    issues.push(`project mismatch: expected ${projectConfig.project}, got ${binding.project}`);
  }
  if (binding.iterations.length === 0) {
    issues.push("at least one iteration is required");
  }

  const productIds = new Set(projectConfig.products.map((product) => product.id));
  const servicesByProduct = new Map(
    projectConfig.products.map((product) => [product.id, new Set(product.services)])
  );
  const iterationIds = new Set<string>();

  for (const iteration of binding.iterations) {
    if (!isSafeId(iteration.id)) {
      issues.push(`invalid iteration id: ${iteration.id}`);
    }
    if (iterationIds.has(iteration.id)) {
      issues.push(`duplicate iteration id: ${iteration.id}`);
    }
    iterationIds.add(iteration.id);
    if (!iteration.docs_branch.trim()) {
      issues.push(`missing docs_branch for iteration ${iteration.id}`);
    }

    const seenProducts = new Set<string>();
    for (const product of iteration.products) {
      if (!productIds.has(product.id)) {
        issues.push(`unknown product in ${iteration.id}: ${product.id}`);
      }
      if (seenProducts.has(product.id)) {
        issues.push(`duplicate product ${product.id} in ${iteration.id}`);
      }
      seenProducts.add(product.id);
      if (!product.version.trim()) {
        issues.push(`missing product version for ${product.id} in ${iteration.id}`);
      }

      const knownServices = servicesByProduct.get(product.id) ?? new Set<string>();
      const seenServices = new Set<string>();
      for (const service of product.services) {
        if (!knownServices.has(service.id)) {
          issues.push(`unknown service in ${iteration.id}/${product.id}: ${service.id}`);
        }
        if (seenServices.has(service.id)) {
          issues.push(`duplicate service ${service.id} in ${iteration.id}/${product.id}`);
        }
        seenServices.add(service.id);
        if (!service.code_root.trim()) {
          issues.push(`missing code_root for ${service.id}`);
        } else if (!(await exists(resolveCodeRoot(service.code_root, projectRoot)))) {
          issues.push(`invalid code_root for ${service.id}: ${service.code_root}`);
        }
        if (!service.required_branch.trim()) {
          issues.push(`missing required_branch for ${service.id}`);
        }
      }
    }

    for (const expectedProduct of projectConfig.products) {
      if (!seenProducts.has(expectedProduct.id)) {
        issues.push(`missing product ${expectedProduct.id} in ${iteration.id}`);
        continue;
      }
      const actualProduct = iteration.products.find((product) => product.id === expectedProduct.id);
      const actualServices = new Set(actualProduct?.services.map((service) => service.id) ?? []);
      for (const expectedService of expectedProduct.services) {
        if (!actualServices.has(expectedService)) {
          issues.push(`missing service ${expectedService} in ${iteration.id}/${expectedProduct.id}`);
        }
      }
    }
  }

  return issues;
}

async function saveBinding(
  projectRoot: string,
  projectConfig: ProjectConfig,
  binding: IterationBindings
): Promise<string[]> {
  const filled: string[] = [];
  const target = path.join(projectRoot, "iteration-bindings.yaml");
  await writeFile(target, serializeIterationBindings(binding), "utf8");

  const firstByProduct = new Map<string, BindingProduct>();
  for (const iteration of binding.iterations) {
    for (const product of iteration.products) {
      if (!firstByProduct.has(product.id)) {
        firstByProduct.set(product.id, product);
      }
    }
  }

  for (const productConfig of projectConfig.products) {
    const productBinding = firstByProduct.get(productConfig.id);
    const productRoot = safeProjectPath(projectRoot, "products", productConfig.id);
    await mkdir(productRoot, { recursive: true });
    const productFile = path.join(productRoot, "product.yaml");
    const services = productConfig.services.map((serviceId) => {
      const serviceBinding = productBinding?.services.find((service) => service.id === serviceId);
      return {
        id: serviceId,
        code_root: serviceBinding?.code_root || projectRoot,
        docs_path: `services/${serviceId}`
      };
    });

    await fillYamlFields(productFile, {
      product: productConfig.id,
      project: projectConfig.project,
      name: productConfig.name,
      services
    }, filled);

    const servicesRoot = path.join(productRoot, "services");
    await mkdir(servicesRoot, { recursive: true });
    for (const serviceId of productConfig.services) {
      const serviceBinding = productBinding?.services.find((service) => service.id === serviceId);
      const serviceRoot = safeProjectPath(servicesRoot, serviceId);
      await mkdir(serviceRoot, { recursive: true });
      await fillYamlFields(path.join(serviceRoot, "service.yaml"), {
        service: serviceId,
        product: productConfig.id,
        project: projectConfig.project,
        code_root: serviceBinding?.code_root || projectRoot,
        docs_path: `products/${productConfig.id}/services/${serviceId}`
      }, filled);
    }
  }

  return filled;
}

async function fillYamlFields(
  target: string,
  expected: Record<string, string | Array<Record<string, string>>>,
  filled: string[]
): Promise<void> {
  if (!(await exists(target))) {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, serializeLooseYaml(expected), "utf8");
    filled.push(target);
    return;
  }

  const before = await readFile(target, "utf8");
  const existingServices = parseServiceListFromYaml(before);
  const expectedServices = expected.services;
  if (Array.isArray(expectedServices) && existingServices.length > 0) {
    const expectedIds = expectedServices.map((service) => service.id);
    const missing = expectedIds.filter((service) => !existingServices.includes(service));
    const extra = existingServices.filter((service) => !expectedIds.includes(service));
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(`${target} has conflicting services: expected ${expectedIds.join(", ")}, got ${existingServices.join(", ")}`);
    }
  }

  const existing = parseTopLevelScalars(before);
  const missing: Record<string, string | Array<Record<string, string>>> = {};

  for (const [key, value] of Object.entries(expected)) {
    if (Array.isArray(value)) {
      if (!new RegExp(`^${escapeRegExp(key)}\\s*:`, "m").test(before)) {
        missing[key] = value;
      }
      continue;
    }

    const current = existing.get(key);
    if (current && current !== value) {
      throw new Error(`${target} has conflicting ${key}: expected ${value}, got ${current}`);
    }
    if (!current) {
      missing[key] = value;
    }
  }

  if (Object.keys(missing).length === 0) {
    return;
  }

  const separator = before.endsWith("\n") ? "" : "\n";
  await writeFile(target, `${before}${separator}${serializeLooseYaml(missing)}`, "utf8");
  filled.push(target);
}

function serializeIterationBindings(binding: IterationBindings): string {
  return `schema_version: 1
project: ${yamlString(binding.project)}

iterations:
${binding.iterations.map((iteration) => `  - id: ${yamlString(iteration.id)}
    docs_branch: ${yamlString(iteration.docs_branch)}
    docs_path: ${yamlString(iteration.docs_path)}
    products:
${iteration.products.map((product) => `      - id: ${yamlString(product.id)}
        version: ${yamlString(product.version)}
        docs_path: ${yamlString(product.docs_path)}
        services:
${product.services.map((service) => `          - id: ${yamlString(service.id)}
            code_root: ${yamlString(service.code_root)}
            required_branch: ${yamlString(service.required_branch)}`).join("\n")}`).join("\n")}`).join("\n")}
`;
}

function serializeLooseYaml(value: Record<string, string | Array<Record<string, string>>>): string {
  const lines: string[] = [];
  for (const [key, item] of Object.entries(value)) {
    if (Array.isArray(item)) {
      lines.push(`${key}:`);
      for (const row of item) {
        const entries = Object.entries(row);
        const firstEntry = entries[0];
        if (!firstEntry) {
          continue;
        }
        const [firstKey, firstValue] = firstEntry;
        lines.push(`  - ${firstKey}: ${yamlString(firstValue)}`);
        for (const [childKey, childValue] of entries.slice(1)) {
          lines.push(`    ${childKey}: ${yamlString(childValue)}`);
        }
      }
    } else {
      lines.push(`${key}: ${yamlString(item)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

async function collectBranchStatuses(
  binding: IterationBindings,
  projectRoot: string
): Promise<Record<string, BranchStatus>> {
  const result: Record<string, BranchStatus> = {};
  const checks = new Map<string, { codeRoot: string; requiredBranch: string }>();

  for (const iteration of binding.iterations) {
    for (const product of iteration.products) {
      for (const service of product.services) {
        const key = `${iteration.id}/${product.id}/${service.id}`;
        checks.set(key, {
          codeRoot: service.code_root,
          requiredBranch: service.required_branch
        });
      }
    }
  }

  for (const [key, check] of checks) {
    result[key] = await getBranchStatus(resolveCodeRoot(check.codeRoot, projectRoot), check.requiredBranch);
  }

  return result;
}

async function getBranchStatus(codeRoot: string, requiredBranch: string): Promise<BranchStatus> {
  const resolved = path.resolve(codeRoot);
  if (!(await exists(resolved))) {
    return {
      current_branch: "",
      status: "missing",
      message: "code_root missing"
    };
  }

  try {
    const { stdout } = await execFileAsync("git", ["-C", resolved, "branch", "--show-current"]);
    const current = stdout.trim();
    return {
      current_branch: current,
      status: current && current === requiredBranch ? "match" : "mismatch",
      message: current ? `${current} / ${requiredBranch}` : `detached or unknown / ${requiredBranch}`
    };
  } catch (error) {
    return {
      current_branch: "",
      status: "unknown",
      message: error instanceof Error ? error.message : "git branch check failed"
    };
  }
}

function coerceBinding(value: unknown, fallbackProject: string): IterationBindings {
  const input = isRecord(value) ? value : {};
  const iterationsValue = Array.isArray(input.iterations) ? input.iterations : [];
  return {
    schema_version: 1,
    project: typeof input.project === "string" ? input.project : fallbackProject,
    iterations: iterationsValue.map(coerceIteration)
  };
}

function coerceIteration(value: unknown): BindingIteration {
  const input = isRecord(value) ? value : {};
  const products = Array.isArray(input.products) ? input.products : [];
  const id = stringValue(input.id);
  return {
    id,
    docs_branch: stringValue(input.docs_branch),
    docs_path: stringValue(input.docs_path) || `iterations/${id}`,
    products: products.map(coerceProduct)
  };
}

function coerceProduct(value: unknown): BindingProduct {
  const input = isRecord(value) ? value : {};
  const services = Array.isArray(input.services) ? input.services : [];
  const id = stringValue(input.id);
  return {
    id,
    version: stringValue(input.version),
    docs_path: stringValue(input.docs_path) || `products/${id}`,
    services: services.map(coerceService)
  };
}

function coerceService(value: unknown): BindingService {
  const input = isRecord(value) ? value : {};
  return {
    id: stringValue(input.id),
    code_root: stringValue(input.code_root),
    required_branch: stringValue(input.required_branch)
  };
}

function parseScalar(line: string): { key: string; value: string } | undefined {
  const match = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line.trim());
  if (!match) {
    return undefined;
  }
  return { key: match[1], value: unquoteYaml(match[2]) };
}

function parseTopLevelScalars(raw: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    if (/^\S[^:]*:/.test(line)) {
      const scalar = parseScalar(line);
      if (scalar && scalar.value) {
        result.set(scalar.key, scalar.value);
      }
    }
  }
  return result;
}

function parseServiceListFromYaml(raw: string): string[] {
  const services: string[] = [];
  let inServices = false;
  for (const line of raw.split(/\r?\n/)) {
    if (/^\S/.test(line)) {
      inServices = /^services\s*:/.test(line);
      continue;
    }
    if (!inServices) {
      continue;
    }
    if (/^\s{2}-\s+id\s*:/.test(line)) {
      services.push(valueAfterColon(line));
      continue;
    }
    if (/^\s{2}-\s+/.test(line)) {
      services.push(unquoteYaml(line.replace(/^\s{2}-\s+/, "")));
    }
  }
  return services.filter(Boolean);
}

function valueAfterColon(line: string): string {
  return unquoteYaml(line.slice(line.indexOf(":") + 1).trim());
}

function unquoteYaml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSafeId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}

function resolveCodeRoot(codeRoot: string, projectRoot: string): string {
  return path.isAbsolute(codeRoot) ? codeRoot : path.resolve(projectRoot, codeRoot);
}

function safeProjectPath(root: string, ...segments: string[]): string {
  for (const segment of segments) {
    if (!isSafeId(segment)) {
      throw new Error(`Unsafe path segment: ${segment}`);
    }
  }
  const resolved = path.resolve(root, ...segments);
  const base = path.resolve(root);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) {
    throw new Error(`Path escapes project root: ${resolved}`);
  }
  return resolved;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text.trim() ? JSON.parse(text) : {};
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(value, null, 2));
}

function sendHtml(response: ServerResponse, html: string): void {
  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(html);
}

function openBrowser(url: string): void {
  const currentPlatform = platform();
  if (currentPlatform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  if (currentPlatform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderPage(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AIOps Config</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fa;
      --panel: #ffffff;
      --line: #d8dee8;
      --text: #172033;
      --muted: #667085;
      --accent: #2563eb;
      --bad: #b42318;
      --good: #067647;
      --warn: #b54708;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      line-height: 1.45;
    }
    header {
      border-bottom: 1px solid var(--line);
      background: var(--panel);
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 2;
    }
    h1 { font-size: 18px; margin: 0; letter-spacing: 0; }
    h2 { font-size: 16px; margin: 0 0 12px; letter-spacing: 0; }
    h3 { font-size: 14px; margin: 0 0 10px; letter-spacing: 0; }
    button {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 6px;
      padding: 7px 10px;
      cursor: pointer;
      color: var(--text);
    }
    button.primary { background: var(--accent); color: white; border-color: var(--accent); }
    button:disabled { opacity: .45; cursor: not-allowed; }
    main {
      display: grid;
      grid-template-columns: minmax(460px, 1fr) minmax(360px, 520px);
      gap: 18px;
      padding: 18px 24px 28px;
      max-width: 1440px;
      margin: 0 auto;
    }
    section, .block {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
    }
    .toolbar { display: flex; align-items: center; gap: 8px; }
    .stack { display: grid; gap: 12px; }
    .row { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 10px; align-items: center; }
    label { color: var(--muted); font-size: 12px; }
    input {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 7px 8px;
      color: var(--text);
      background: #fff;
      font: inherit;
    }
    .iteration { display: grid; gap: 12px; }
    .product { border-top: 1px solid var(--line); padding-top: 12px; display: grid; gap: 10px; }
    .service {
      display: grid;
      grid-template-columns: 120px minmax(0, 1.3fr) minmax(0, .8fr) 92px;
      gap: 8px;
      align-items: center;
    }
    .badge { border-radius: 999px; padding: 4px 8px; font-size: 12px; text-align: center; border: 1px solid var(--line); }
    .match { color: var(--good); background: #ecfdf3; border-color: #abefc6; }
    .mismatch, .missing { color: var(--bad); background: #fef3f2; border-color: #fecdca; }
    .unknown { color: var(--warn); background: #fffaeb; border-color: #fedf89; }
    textarea {
      width: 100%;
      min-height: 520px;
      resize: vertical;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 12px;
      font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: var(--text);
      background: #fbfcfe;
    }
    .status { color: var(--muted); white-space: pre-wrap; }
    @media (max-width: 980px) {
      main { grid-template-columns: 1fr; padding: 14px; }
      header { padding: 12px 14px; }
      .service { grid-template-columns: 1fr; }
      .row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <h1>AIOps Config</h1>
    <div class="toolbar">
      <button id="add">Add Iteration</button>
      <button id="reload">Reload</button>
      <button id="save" class="primary">Save</button>
    </div>
  </header>
  <main>
    <section>
      <h2 id="project">Project</h2>
      <div id="iterations" class="stack"></div>
    </section>
    <aside class="stack">
      <section>
        <h2>Preview</h2>
        <textarea id="preview" spellcheck="false" readonly></textarea>
      </section>
      <section>
        <h2>Status</h2>
        <div id="status" class="status"></div>
      </section>
    </aside>
  </main>
  <script>
    let state;
    const el = (id) => document.getElementById(id);

    async function load() {
      const response = await fetch('/api/config');
      state = await response.json();
      if (!response.ok) throw new Error(state.error || 'load failed');
      render();
    }

    function render() {
      el('project').textContent = state.projectConfig.project;
      el('save').disabled = state.readOnly;
      const root = el('iterations');
      root.textContent = '';
      state.binding.iterations.forEach((iteration, iterationIndex) => {
        const block = document.createElement('div');
        block.className = 'block iteration';
        block.innerHTML =
          '<div class="toolbar"><h2 style="flex:1">' + esc(iteration.id || 'iteration') + '</h2>' +
          '<button data-copy="' + iterationIndex + '">Copy</button>' +
          '<button data-delete="' + iterationIndex + '">Delete</button></div>' +
          row('Iteration', input(iteration.id, 'data-field="id" data-i="' + iterationIndex + '"')) +
          row('Docs branch', input(iteration.docs_branch, 'data-field="docs_branch" data-i="' + iterationIndex + '"'));
        iteration.products.forEach((product, productIndex) => {
          const productNode = document.createElement('div');
          productNode.className = 'product';
          productNode.innerHTML =
            '<h3>' + esc(product.id) + '</h3>' +
            row('Product version', input(product.version, 'data-field="version" data-i="' + iterationIndex + '" data-p="' + productIndex + '"'));
          product.services.forEach((service, serviceIndex) => {
            const key = iteration.id + '/' + product.id + '/' + service.id;
            const branch = state.branches[key] || { status: 'unknown', message: 'unknown' };
            const node = document.createElement('div');
            node.className = 'service';
            node.innerHTML =
              '<strong>' + esc(service.id) + '</strong>' +
              input(service.code_root, 'data-field="code_root" data-i="' + iterationIndex + '" data-p="' + productIndex + '" data-s="' + serviceIndex + '"') +
              input(service.required_branch, 'data-field="required_branch" data-i="' + iterationIndex + '" data-p="' + productIndex + '" data-s="' + serviceIndex + '"') +
              '<span class="badge ' + esc(branch.status) + '">' + esc(branch.status) + '</span>';
            productNode.appendChild(node);
          });
          block.appendChild(productNode);
        });
        root.appendChild(block);
      });
      el('preview').value = toYaml(state.binding);
      el('status').textContent = state.readOnly ? 'read-only' : 'ready';
      bindInputs();
    }

    function bindInputs() {
      document.querySelectorAll('input[data-field]').forEach((node) => {
        node.addEventListener('input', () => {
          const i = Number(node.dataset.i);
          const p = node.dataset.p === undefined ? undefined : Number(node.dataset.p);
          const s = node.dataset.s === undefined ? undefined : Number(node.dataset.s);
          if (p === undefined) state.binding.iterations[i][node.dataset.field] = node.value;
          else if (s === undefined) state.binding.iterations[i].products[p][node.dataset.field] = node.value;
          else state.binding.iterations[i].products[p].services[s][node.dataset.field] = node.value;
          state.binding.iterations[i].docs_path = 'iterations/' + state.binding.iterations[i].id;
          state.binding.iterations[i].products.forEach((product) => { product.docs_path = 'products/' + product.id; });
          el('preview').value = toYaml(state.binding);
        });
      });
      document.querySelectorAll('button[data-copy]').forEach((button) => {
        button.addEventListener('click', () => {
          const original = state.binding.iterations[Number(button.dataset.copy)];
          const copy = JSON.parse(JSON.stringify(original));
          copy.id = copy.id + '-copy';
          copy.docs_path = 'iterations/' + copy.id;
          state.binding.iterations.push(copy);
          render();
        });
      });
      document.querySelectorAll('button[data-delete]').forEach((button) => {
        button.addEventListener('click', () => {
          if (state.binding.iterations.length > 1) {
            state.binding.iterations.splice(Number(button.dataset.delete), 1);
            render();
          }
        });
      });
    }

    el('add').addEventListener('click', () => {
      const base = state.binding.iterations[0];
      const item = JSON.parse(JSON.stringify(base));
      item.id = 'new-iteration';
      item.docs_branch = 'main';
      item.docs_path = 'iterations/new-iteration';
      item.products.forEach((product) => { product.version = item.id; });
      state.binding.iterations.push(item);
      render();
    });

    el('reload').addEventListener('click', () => load().catch(showError));
    el('save').addEventListener('click', async () => {
      try {
        const response = await fetch('/api/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(state.binding)
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'save failed');
        state = body;
        render();
        el('status').textContent = 'saved';
      } catch (error) {
        showError(error);
      }
    });

    function row(label, control) {
      return '<div class="row"><label>' + esc(label) + '</label>' + control + '</div>';
    }
    function input(value, attrs) {
      return '<input value="' + esc(value || '') + '" ' + attrs + '>';
    }
    function esc(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    }
    function q(value) { return JSON.stringify(value || ''); }
    function toYaml(binding) {
      return 'schema_version: 1\\nproject: ' + q(binding.project) + '\\n\\niterations:\\n' +
        binding.iterations.map((iteration) =>
          '  - id: ' + q(iteration.id) + '\\n' +
          '    docs_branch: ' + q(iteration.docs_branch) + '\\n' +
          '    docs_path: ' + q(iteration.docs_path) + '\\n' +
          '    products:\\n' +
          iteration.products.map((product) =>
            '      - id: ' + q(product.id) + '\\n' +
            '        version: ' + q(product.version) + '\\n' +
            '        docs_path: ' + q(product.docs_path) + '\\n' +
            '        services:\\n' +
            product.services.map((service) =>
              '          - id: ' + q(service.id) + '\\n' +
              '            code_root: ' + q(service.code_root) + '\\n' +
              '            required_branch: ' + q(service.required_branch)
            ).join('\\n')
          ).join('\\n')
        ).join('\\n');
    }
    function showError(error) {
      el('status').textContent = error instanceof Error ? error.message : String(error);
    }
    load().catch(showError);
  </script>
</body>
</html>`;
}
