import {
  MessageType,
  decodeMessage,
  encodeSyncStep1,
  encodeSyncStep2,
  encodeUpdate,
  encodeAwareness,
} from "@/websocket/protocol";

describe("WebSocket Binary Protocol Unit Tests", () => {
  const dummyData = new Uint8Array([10, 20, 30, 40]);

  test("should correctly encode and decode SYNC_STEP_1 frame", () => {
    const encoded = encodeSyncStep1(dummyData);
    expect(encoded[0]).toBe(MessageType.SYNC_STEP_1);

    const decoded = decodeMessage(encoded);
    expect(decoded.type).toBe(MessageType.SYNC_STEP_1);
    expect(decoded.data).toEqual(dummyData);
  });

  test("should correctly encode and decode SYNC_STEP_2 frame", () => {
    const encoded = encodeSyncStep2(dummyData);
    expect(encoded[0]).toBe(MessageType.SYNC_STEP_2);

    const decoded = decodeMessage(encoded);
    expect(decoded.type).toBe(MessageType.SYNC_STEP_2);
    expect(decoded.data).toEqual(dummyData);
  });

  test("should correctly encode and decode UPDATE frame", () => {
    const encoded = encodeUpdate(dummyData);
    expect(encoded[0]).toBe(MessageType.UPDATE);

    const decoded = decodeMessage(encoded);
    expect(decoded.type).toBe(MessageType.UPDATE);
    expect(decoded.data).toEqual(dummyData);
  });

  test("should correctly encode and decode AWARENESS frame", () => {
    const encoded = encodeAwareness(dummyData);
    expect(encoded[0]).toBe(MessageType.AWARENESS);

    const decoded = decodeMessage(encoded);
    expect(decoded.type).toBe(MessageType.AWARENESS);
    expect(decoded.data).toEqual(dummyData);
  });
});
