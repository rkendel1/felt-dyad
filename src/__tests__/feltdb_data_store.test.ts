import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FeltDBDataStore, type FeltDBRecord } from "../store/feltdb_data_store";

type TestRecord = FeltDBRecord & { name: string };

describe("FeltDBDataStore", () => {
  let dataPath: string;
  let store: FeltDBDataStore;

  beforeEach(async () => {
    dataPath = await fs.mkdtemp(path.join(os.tmpdir(), "feltdb-data-store-"));
    store = new FeltDBDataStore(dataPath);
  });

  afterEach(async () => {
    await store.close();
    await fs.rm(dataPath, { recursive: true, force: true });
  });

  it("persists direct-addressable records across store instances", async () => {
    const first = await store.create<TestRecord>("items", { name: "first" });
    const second = await store.create<TestRecord>("items", { name: "second" });

    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
    expect((await store.get<TestRecord>("items", first.id))?.name).toBe(
      "first",
    );

    await store.close();
    store = new FeltDBDataStore(dataPath);

    const updated = await store.update<TestRecord>("items", second.id, {
      name: "updated",
    });
    expect(updated.name).toBe("updated");

    await store.delete("items", first.id);
    expect(await store.get<TestRecord>("items", first.id)).toBeNull();
    expect((await store.list<TestRecord>("items")).map(({ id }) => id)).toEqual(
      [second.id],
    );
  });

  it("allocates unique IDs during concurrent first writes", async () => {
    const records = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        store.create<TestRecord>("concurrent", { name: `item-${index}` }),
      ),
    );

    expect(new Set(records.map(({ id }) => id)).size).toBe(records.length);
    expect(await store.list<TestRecord>("concurrent")).toHaveLength(10);
  });
});
