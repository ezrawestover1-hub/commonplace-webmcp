import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuroraWorkspace } from "./data";
import { registerCommonplaceTools } from "./webmcp";

const originalModelContext = Object.getOwnPropertyDescriptor(document, "modelContext");

afterEach(() => {
  if (originalModelContext) Object.defineProperty(document, "modelContext", originalModelContext);
  else delete (document as Document & { modelContext?: unknown }).modelContext;
});

describe("WebMCP tool contract", () => {
  it("registers the complete named tool surface when the browser exposes WebMCP", async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, "modelContext", { configurable: true, value: { registerTool } });
    let workspace = createAuroraWorkspace();
    const registration = registerCommonplaceTools(() => workspace, (update) => { workspace = typeof update === "function" ? update(workspace) : update; });

    await Promise.resolve();

    expect(registration).toMatchObject({ supported: true, toolCount: 12 });
    expect(registerTool).toHaveBeenCalledTimes(12);
    expect(registerTool.mock.calls.map(([tool]) => tool.name)).toEqual([
      "inspect_workspace", "search_objects", "get_objects", "create_objects", "update_objects", "move_objects",
      "group_objects", "transform_objects", "connect_objects", "propose_changes", "request_human_decision", "get_history"
    ]);
    expect(registerTool.mock.calls.slice(0, 3).every(([tool]) => tool.annotations?.readOnlyHint)).toBe(true);
    registration.cleanup();
  });

  it("returns an honest unsupported result when WebMCP is absent", () => {
    delete (document as Document & { modelContext?: unknown }).modelContext;
    const registration = registerCommonplaceTools(createAuroraWorkspace, vi.fn());
    expect(registration).toMatchObject({ supported: false, toolCount: 0 });
  });
});
