import { WORKSPACE_HOOK_TEMPLATES } from "../templates/workspace-hooks.js";

export type WorkspaceHookFileName = keyof typeof WORKSPACE_HOOK_TEMPLATES;

export interface WorkspaceHookTemplate {
  readonly fileName: WorkspaceHookFileName;
  readonly relativePath: `.aiops/hooks/${WorkspaceHookFileName}`;
  readonly content: string;
}

export function listWorkspaceHookTemplates(): WorkspaceHookTemplate[] {
  return (Object.keys(WORKSPACE_HOOK_TEMPLATES) as WorkspaceHookFileName[]).map((typedName) => {
    const content = WORKSPACE_HOOK_TEMPLATES[typedName];
    return {
      fileName: typedName,
      relativePath: `.aiops/hooks/${typedName}`,
      content,
    };
  });
}

export function getWorkspaceHookTemplate(fileName: WorkspaceHookFileName): string {
  return WORKSPACE_HOOK_TEMPLATES[fileName];
}
