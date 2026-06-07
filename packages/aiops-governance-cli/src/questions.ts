export type GovernanceLevel = "low" | "medium" | "high" | "xhigh";

export interface BootstrapAnswers {
  projectId: string;
  productDomains: string[];
  governanceLevel: GovernanceLevel;
  knowledgeLanguage: string;
}

export interface BootstrapDefaults extends BootstrapAnswers {}

export type BootstrapQuestionId =
  | "projectId"
  | "productDomains"
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
      id: "productDomains",
      label: "Product domains",
      defaultValue: defaults.productDomains.join(","),
      help: "comma-separated domains; empty means core"
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

export function parseProductDomains(value: string | undefined): string[] {
  if (!value || !value.trim()) {
    return ["core"];
  }

  const domains = value
    .split(",")
    .map((domain) => normalizeProjectId(domain))
    .filter(Boolean);

  return domains.length > 0 ? Array.from(new Set(domains)) : ["core"];
}

export function parseGovernanceLevel(value: string): GovernanceLevel {
  if (GOVERNANCE_LEVELS.includes(value as GovernanceLevel)) {
    return value as GovernanceLevel;
  }

  throw new Error(
    `Invalid governance level "${value}". Expected one of: ${GOVERNANCE_LEVELS.join(", ")}`
  );
}
