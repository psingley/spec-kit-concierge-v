export type McpServerSummary = {
  name: string;
  configured: boolean;
};

export type AuthStatusSlot = {
  copilotLoggedIn: boolean | null;
  githubLoggedIn: boolean | null;
};

export type McpConfigSlot = {
  mcpServers: Record<string, McpServerSummary>;
  configReadAt: string;
};
