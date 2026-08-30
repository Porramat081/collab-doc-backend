export enum MessageType {
  SYNC_STEP_1 = 0,
  SYNC_STEP_2 = 1,
  UPDATE = 2,
  AWARENESS = 3,
}

export interface DecodedMessage {
  type: MessageType;
  data: Uint8Array;
}

/**
 * Decodes incoming binary frame by extracting 1-byte message type prefix.
 */
export function decodeMessage(payload: Uint8Array): DecodedMessage {
  const type = payload[0] as MessageType;
  const data = payload.subarray(1);
  return { type, data };
}

/**
 * Encodes State Vector payload for Sync Step 1.
 */
export function encodeSyncStep1(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length + 1);
  result[0] = MessageType.SYNC_STEP_1;
  result.set(data, 1);
  return result;
}

/**
 * Encodes diff update payload for Sync Step 2.
 */
export function encodeSyncStep2(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length + 1);
  result[0] = MessageType.SYNC_STEP_2;
  result.set(data, 1);
  return result;
}

/**
 * Encodes incremental CRDT update payload.
 */
export function encodeUpdate(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length + 1);
  result[0] = MessageType.UPDATE;
  result.set(data, 1);
  return result;
}

export function encodeAwareness(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length + 1);
  result[0] = MessageType.AWARENESS;
  result.set(data, 1);
  return result;
}
