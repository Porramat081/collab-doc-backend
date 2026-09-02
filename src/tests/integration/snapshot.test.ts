import * as Y from "yjs";
import { snapshotWorker } from "../../workers/snapshot.worker.js";
import { documentRepository } from "../../repositories/document.repository.js";

// Mock repository methods
jest.mock("../../repositories/document.repository");

describe("SnapshotWorker Integration Test", () => {
  const docId = "doc-test-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should compact raw CRDT updates into a base snapshot", async () => {
    // 1. Create two separate Y.Doc updates
    const doc1 = new Y.Doc();
    const text1 = doc1.getText("content");
    text1.insert(0, "Hello ");
    const update1 = Y.encodeStateAsUpdate(doc1);

    const doc2 = new Y.Doc();
    Y.applyUpdate(doc2, update1);
    const text2 = doc2.getText("content");
    text2.insert(6, "World!");
    const update2 = Y.encodeStateAsUpdate(doc2);

    // 2. Mock repository response
    (documentRepository.findContentById as jest.Mock).mockResolvedValue(null);
    (documentRepository.getCRDTUpdate as jest.Mock).mockResolvedValue([
      Buffer.from(update1),
      Buffer.from(update2),
    ]);

    // 3. Trigger worker compaction
    await snapshotWorker.processDocument(docId);

    // 4. Verify saveSnapshotAndClearUpdates was called with valid merged state
    expect(
      documentRepository.saveSnapshotAndClearUpdates,
    ).toHaveBeenCalledTimes(1);

    const [calledDocId, base64Snapshot] = (
      documentRepository.saveSnapshotAndClearUpdates as jest.Mock
    ).mock.calls[0];

    expect(calledDocId).toBe(docId);

    // Reconstruct Y.Doc from saved base64 snapshot and check content
    const verifiedDoc = new Y.Doc();
    Y.applyUpdate(
      verifiedDoc,
      new Uint8Array(Buffer.from(base64Snapshot, "base64")),
    );
    expect(verifiedDoc.getText("content").toString()).toBe("Hello World!");
  });
});
