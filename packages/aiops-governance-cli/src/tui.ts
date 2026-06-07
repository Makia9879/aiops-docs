import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  createBootstrapQuestions,
  parseGovernanceLevel,
  parseProductDomains,
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

    return {
      projectId: normalizeProjectId(values.get("projectId") ?? defaults.projectId),
      productDomains: parseProductDomains(values.get("productDomains")),
      governanceLevel: parseGovernanceLevel(
        values.get("governanceLevel") ?? defaults.governanceLevel
      ),
      knowledgeLanguage: values.get("knowledgeLanguage") || defaults.knowledgeLanguage
    };
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

  return {
    projectId: normalizeProjectId(values.get("projectId") ?? defaults.projectId),
    productDomains: parseProductDomains(values.get("productDomains")),
    governanceLevel: parseGovernanceLevel(
      values.get("governanceLevel") ?? defaults.governanceLevel
    ),
    knowledgeLanguage: values.get("knowledgeLanguage") || defaults.knowledgeLanguage
  };
}
