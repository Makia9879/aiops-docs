import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  createBootstrapQuestions,
  createBootstrapProducts,
  createBootstrapProductsFromRepos,
  parseGovernanceLevel,
  normalizeProjectId,
  type BootstrapAnswers,
  type BootstrapDefaults
} from "./questions.js";

export async function promptForAnswers(
  defaults: BootstrapDefaults
): Promise<BootstrapAnswers> {
  if (!input.isTTY) {
    return answersFromPipedInput(defaults);
  }

  const rl = readline.createInterface({ input, output });

  try {
    const values = new Map<string, string>();
    for (const question of createBootstrapQuestions(defaults)) {
      const answer = await rl.question(
        `${question.label} [${question.defaultValue}] (${question.help}): `
      );
      values.set(question.id, answer.trim() || question.defaultValue);
    }

    const products = values.get("productRepos")
      ? await createBootstrapProductsFromRepos({
          workspaceRoot: defaults.workspaceRoot ?? process.cwd(),
          productRepos: values.get("productRepos") ?? "",
          requiredBranch: defaults.products[0]?.services[0]?.requiredBranch
        })
      : createBootstrapProducts({
          products: values.get("products"),
          services: values.get("services"),
          codeRoot: defaults.products[0]?.services[0]?.codeRoot ?? ".",
          requiredBranch: defaults.products[0]?.services[0]?.requiredBranch ?? "main"
        });

    return {
      projectId: normalizeProjectId(values.get("projectId") ?? defaults.projectId),
      products,
      projectIteration: defaults.projectIteration,
      docsBranch: defaults.docsBranch,
      governanceLevel: parseGovernanceLevel(
        values.get("governanceLevel") ?? defaults.governanceLevel
      ),
      knowledgeLanguage: values.get("knowledgeLanguage") || defaults.knowledgeLanguage
    };
  } finally {
    rl.close();
  }
}

export async function promptForToolchainRepair(toolCount: number): Promise<boolean> {
  if (!input.isTTY) {
    return false;
  }

  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(
      `Install or repair ${toolCount} missing AIOps toolchain item(s) now? [Y/n]: `
    );
    const normalized = answer.trim().toLowerCase();
    return normalized === "" || normalized === "y" || normalized === "yes";
  } finally {
    rl.close();
  }
}

async function answersFromPipedInput(defaults: BootstrapDefaults): Promise<BootstrapAnswers> {
  const chunks: Buffer[] = [];
  for await (const chunk of input) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const lines = Buffer.concat(chunks).toString("utf8").split(/\r?\n/);
  const questions = createBootstrapQuestions(defaults);
  const values = new Map<string, string>();

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const answer = lines[index]?.trim();
    values.set(question.id, answer || question.defaultValue);
  }

  const products = values.get("productRepos")
    ? await createBootstrapProductsFromRepos({
        workspaceRoot: defaults.workspaceRoot ?? process.cwd(),
        productRepos: values.get("productRepos") ?? "",
        requiredBranch: defaults.products[0]?.services[0]?.requiredBranch
      })
    : createBootstrapProducts({
        products: values.get("products"),
        services: values.get("services"),
        codeRoot: defaults.products[0]?.services[0]?.codeRoot ?? ".",
        requiredBranch: defaults.products[0]?.services[0]?.requiredBranch ?? "main"
      });

  return {
    projectId: normalizeProjectId(values.get("projectId") ?? defaults.projectId),
    products,
    projectIteration: defaults.projectIteration,
    docsBranch: defaults.docsBranch,
    governanceLevel: parseGovernanceLevel(
      values.get("governanceLevel") ?? defaults.governanceLevel
    ),
    knowledgeLanguage: values.get("knowledgeLanguage") || defaults.knowledgeLanguage
  };
}
