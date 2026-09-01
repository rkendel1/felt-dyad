import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { createFeltDB } from "@feltdb/core";
import { readLocalFeltDBState } from "./feltdb_handlers";

describe("readLocalFeltDBState", () => {
  const directories: string[] = [];
  afterEach(async () => {
    await Promise.all(
      directories
        .splice(0)
        .map((directory) => rm(directory, { recursive: true, force: true })),
    );
  });

  it("reports an imported app without a flow as unconverted", async () => {
    const appPath = await mkdtemp(path.join(tmpdir(), "unconverted-app-"));
    directories.push(appPath);
    await expect(readLocalFeltDBState(appPath)).resolves.toEqual({
      configured: false,
      collections: [],
      message: "This app has not been converted to FeltDB yet.",
    });
  });

  it("returns declared collections with real record counts", async () => {
    const appPath = await mkdtemp(path.join(tmpdir(), "feltdb-state-"));
    directories.push(appPath);
    await writeFile(
      path.join(appPath, "feltdb.flow"),
      "flow_version 1\napp StateTest {\n collection Todo {\n title: string\n }\n}",
    );
    const db = createFeltDB({
      namespace: "StateTest",
      path: path.join(appPath, ".feltdb", "data"),
    });
    await db.collection("Todo").insert({ id: "one", title: "First" }, "one");
    await db.close();

    await expect(readLocalFeltDBState(appPath)).resolves.toEqual({
      configured: true,
      collections: [{ name: "Todo", recordCount: 1 }],
    });
  });
});
