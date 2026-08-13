export type ModelRole = "coding" | "fast" | "reasoning" | "vision";

export interface ModelDescriptor {
  id: string;
  provider: string;
  role: ModelRole;
}

export interface ModelProvider {
  getModel(role: ModelRole): Promise<ModelDescriptor>;
}
