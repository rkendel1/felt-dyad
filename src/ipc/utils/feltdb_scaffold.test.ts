import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { configureFeltDBScaffold } from "./feltdb_scaffold";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe("configureFeltDBScaffold", () => {
  it("gives each generated app a valid flow name and namespace", async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), "feltdb-scaffold-"),
    );
    temporaryDirectories.push(directory);
    await fs.cp(path.resolve("scaffold"), directory, { recursive: true });

    await configureFeltDBScaffold(directory, "Wise Chameleon!");

    expect(
      await fs.readFile(path.join(directory, "feltdb.flow"), "utf8"),
    ).toContain("app WiseChameleon");
    expect(
      JSON.parse(
        await fs.readFile(path.join(directory, "feltdb.config.json"), "utf8"),
      ).namespace,
    ).toBe("wise-chameleon");
    expect(
      await fs.readFile(path.join(directory, "src/lib/feltdb.ts"), "utf8"),
    ).not.toContain("{{APP_NAMESPACE}}");
  });
});
