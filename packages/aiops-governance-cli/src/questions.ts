import { access, readFile } from "node:fs/promises";
import path from "node:path";

export type GovernanceLevel = "low" | "medium" | "high" | "xhigh";

export interface BootstrapService {
  id: string;
  codeRoot: string;
  requiredBranch: string;
}

export interface BootstrapProduct {
  id: string;
  name: string;
  services: BootstrapService[];
}

export interface BootstrapAnswers {
  projectId: string;
  products: BootstrapProduct[];
  projectIteration: string;
  docsBranch: string;
  governanceLevel: GovernanceLevel;
  knowledgeLanguage: string;
}

export interface BootstrapDefaults extends BootstrapAnswers {
  productRepos?: string;
  workspaceRoot?: string;
}

export type BootstrapQuestionId =
  | "projectId"
  | "products"
  | "services"
  | "productRepos"
  | "governanceLevel"
  | "knowledgeLanguage";

export interface BootstrapQuestion {
  id: BootstrapQuestionId;
  label: string;
  defaultValue: string;
  help: string;
}

export const GOVERNANCE_LEVELS: GovernanceLevel[] = [
  "low",
  "medium",
  "high",
  "xhigh"
];

export function createBootstrapQuestions(
  defaults: BootstrapDefaults
): BootstrapQuestion[] {
  return [
    {
      id: "projectId",
      label: "Project id",
      defaultValue: defaults.projectId,
      help: "kebab-case project identifier under .aiops/projects/"
    },
    {
      id: "products",
      label: "Products",
      defaultValue: defaults.products.map((product) => product.id).join(","),
      help: "comma-separated products; empty means core"
    },
    {
      id: "services",
      label: "Services",
      defaultValue: formatServiceGroups(defaults.products),
      help: "product:service+service groups; empty means <product>-service"
    },
    {
      id: "productRepos",
      label: "Product repos",
      defaultValue: defaults.productRepos ?? "",
      help: "comma-separated repo paths or product=path mappings; empty keeps Products/Services"
    },
    {
      id: "governanceLevel",
      label: "Governance level",
      defaultValue: defaults.governanceLevel,
      help: "one of low, medium, high, xhigh"
    },
    {
      id: "knowledgeLanguage",
      label: "Knowledge language",
      defaultValue: defaults.knowledgeLanguage,
      help: "default zh-CN unless the workspace chooses another language"
    }
  ];
}

export function normalizeProjectId(value: string): string {
  const normalized = value
    .trim()
    .replace(/^@/, "")
    .replace(/[\\/]+/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "project";
}

export function createBootstrapProducts(options: {
  products?: string;
  services?: string;
  codeRoot: string;
  requiredBranch: string;
}): BootstrapProduct[] {
  const productIds = parseIdList(options.products, ["core"]);
  const serviceGroups = parseServiceGroups(options.services, productIds);

  return productIds.map((productId) => ({
    id: productId,
    name: productId,
    services: serviceGroups[productId].map((serviceId) => ({
      id: serviceId,
      codeRoot: options.codeRoot,
      requiredBranch: options.requiredBranch
    }))
  }));
}

export async function createBootstrapProductsFromRepos(options: {
  workspaceRoot: string;
  productRepos: string;
  requiredBranch?: string;
}): Promise<BootstrapProduct[]> {
  const repos = parseProductRepos(options.productRepos, options.workspaceRoot);
  if (repos.length === 0) {
    throw new Error("No product repositories were provided.");
  }

  const products: BootstrapProduct[] = [];
  for (const repo of repos) {
    const branch = options.requiredBranch ?? await readCurrentGitBranch(repo.codeRoot);
    products.push({
      id: repo.productId,
      name: repo.productId,
      services: [
        {
          id: repo.serviceId,
          codeRoot: repo.codeRoot,
          requiredBranch: branch
        }
      ]
    });
  }

  return products;
}

export function formatProductRepos(products: BootstrapProduct[]): string {
  return products
    .map((product) => {
      const service = product.services[0];
      return `${product.id}=${service?.codeRoot ?? ""}`;
    })
    .join(",");
}

function parseIdList(value: string | undefined, fallback: string[]): string[] {
  if (!value || !value.trim()) {
    return fallback;
  }

  const ids = value
    .split(",")
    .map((item) => normalizeProjectId(item))
    .filter(Boolean);

  return ids.length > 0 ? Array.from(new Set(ids)) : fallback;
}

function parseServiceGroups(value: string | undefined, productIds: string[]): Record<string, string[]> {
  const defaults = Object.fromEntries(
    productIds.map((productId) => [productId, [`${productId}-service`]])
  );

  if (!value || !value.trim()) {
    return defaults;
  }

  const groups: Record<string, string[]> = { ...defaults };
  const chunks = value.split(",").map((chunk) => chunk.trim()).filter(Boolean);
  const hasNamedGroups = chunks.some((chunk) => chunk.includes(":"));

  if (!hasNamedGroups) {
    if (productIds.length === 1) {
      groups[productIds[0]] = parseServiceList(value);
      return groups;
    }

    const ordered = chunks.map((chunk) => normalizeProjectId(chunk)).filter(Boolean);
    if (ordered.length === productIds.length) {
      for (let index = 0; index < productIds.length; index += 1) {
        groups[productIds[index]] = [ordered[index]];
      }
    }
    return groups;
  }

  for (const chunk of chunks) {
    const [rawProduct, rawServices] = chunk.split(":", 2);
    const productId = normalizeProjectId(rawProduct);
    if (!productIds.includes(productId)) {
      continue;
    }
    const services = parseServiceList(rawServices);
    if (services.length > 0) {
      groups[productId] = services;
    }
  }

  return groups;
}

interface ProductRepoMapping {
  productId: string;
  serviceId: string;
  codeRoot: string;
}

function parseProductRepos(value: string, workspaceRoot: string): ProductRepoMapping[] {
  const result: ProductRepoMapping[] = [];
  const seen = new Set<string>();
  const chunks = value.split(",").map((chunk) => chunk.trim()).filter(Boolean);

  for (const chunk of chunks) {
    const mapping = parseProductRepo(chunk, workspaceRoot);
    if (seen.has(mapping.productId)) {
      throw new Error(`Duplicate product repository mapping: ${mapping.productId}`);
    }
    seen.add(mapping.productId);
    result.push(mapping);
  }

  return result;
}

function parseProductRepo(value: string, workspaceRoot: string): ProductRepoMapping {
  const [left, right] = splitMapping(value);
  const rawCodeRoot = right ?? left;
  const codeRoot = path.resolve(workspaceRoot, rawCodeRoot);
  const productId = normalizeProjectId(right ? left : path.basename(codeRoot));

  return {
    productId,
    serviceId: productId,
    codeRoot
  };
}

function splitMapping(value: string): [string, string | undefined] {
  const delimiter = value.indexOf("=");
  if (delimiter < 0) {
    return [value, undefined];
  }

  const left = value.slice(0, delimiter).trim();
  const right = value.slice(delimiter + 1).trim();
  if (!left || !right) {
    throw new Error(`Invalid product repository mapping: ${value}`);
  }
  return [left, right];
}

async function readCurrentGitBranch(repoRoot: string): Promise<string> {
  const headPath = path.join(repoRoot, ".git", "HEAD");
  try {
    const head = (await readFile(headPath, "utf8")).trim();
    const refPrefix = "ref: refs/heads/";
    if (head.startsWith(refPrefix)) {
      return head.slice(refPrefix.length);
    }
    if (head) {
      return head;
    }
  } catch {
    if (!(await exists(repoRoot))) {
      throw new Error(`Product repository does not exist: ${repoRoot}`);
    }
  }

  return "main";
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function parseServiceList(value: string | undefined): string[] {
  if (!value || !value.trim()) {
    return [];
  }

  const services = value
    .split(/[+|]/)
    .map((service) => normalizeProjectId(service))
    .filter(Boolean);

  return services.length > 0 ? Array.from(new Set(services)) : [];
}

function formatServiceGroups(products: BootstrapProduct[]): string {
  return products
    .map((product) => `${product.id}:${product.services.map((service) => service.id).join("+")}`)
    .join(",");
}

export function parseGovernanceLevel(value: string): GovernanceLevel {
  if (GOVERNANCE_LEVELS.includes(value as GovernanceLevel)) {
    return value as GovernanceLevel;
  }

  throw new Error(
    `Invalid governance level "${value}". Expected one of: ${GOVERNANCE_LEVELS.join(", ")}`
  );
}
