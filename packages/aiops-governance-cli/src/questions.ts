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

export interface BootstrapDefaults extends BootstrapAnswers {}

export type BootstrapQuestionId =
  | "projectId"
  | "products"
  | "services"
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
