export const PLATFORM_NAME = "Wex Agent";
export const PLATFORM_PHASE = "Monorepo foundation";

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
