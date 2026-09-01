import { afterEach, describe, expect, it, vi } from "vitest";
import { listFeltDBProjects } from "./feltdb_oauth";

describe("managed FeltDB projects", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists projects using the configured managed endpoint and token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ projects: [{ id: "project-1", name: "Portal" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const projects = await listFeltDBProjects({
      accessToken: "secret",
      accountId: "account-1",
      email: "owner@example.com",
      apiUrl: "https://managed.example.com",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://managed.example.com/v1/projects?accountId=account-1"),
      { headers: { Authorization: "Bearer secret" } },
    );
    expect(projects).toEqual([
      {
        id: "project-1",
        name: "Portal",
        url: "https://managed.example.com/projects/project-1",
      },
    ]);
  });
});
