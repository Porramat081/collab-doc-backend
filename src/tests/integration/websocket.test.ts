import http from "http";
import WebSocket from "ws";
import jwt from "jsonwebtoken";
import { CollaborativeWebSocketServer } from "../../websocket/server";
import {
  encodeSyncStep1,
  decodeMessage,
  MessageType,
} from "../../websocket/protocol";

// Mock document service to return empty initial document state
jest.mock("../../services/document.service", () => ({
  documentService: {
    getDocumentContent: jest.fn().mockResolvedValue({
      documentId: "test-doc-1",
      baseSnapshot: undefined,
      crdtUpdates: [],
    }),
    applyCRDTUpdate: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("WebSocket Connection & Handshake Tests", () => {
  let server: http.Server;
  let port: number;
  const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

  beforeAll((done) => {
    server = http.createServer();
    new CollaborativeWebSocketServer(server);
    server.listen(0, () => {
      // @ts-ignore
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test("should reject connection when token is missing", (done) => {
    const client = new WebSocket(
      `ws://localhost:${port}/ws/documents?documentId=test-doc-1`,
    );

    let responded = false;
    client.on("unexpected-response", (req, res) => {
      responded = true;
      expect(res.statusCode).toBe(401);
      if (client.readyState !== WebSocket.CLOSED) {
        client.close();
      }
      done();
    });

    client.on("close", () => {
      if (!responded) {
        done();
      }
    });

    client.on("error", () => {
      if (!responded) {
        done();
      }
    });
  });

  test("should accept connection with valid token and send SYNC_STEP_1", (done) => {
    const token = jwt.sign(
      { userId: "user-1", email: "user@test.com" },
      JWT_SECRET,
    );

    const client = new WebSocket(
      `ws://localhost:${port}/ws/documents?documentId=test-doc-1`,
      ["access_token", token],
    );

    client.on("open", () => {
      // Request initial sync
      const syncMsg = encodeSyncStep1(new Uint8Array([0]));
      client.send(syncMsg);
    });

    client.on("message", (data: Buffer) => {
      const decoded = decodeMessage(new Uint8Array(data));
      expect([MessageType.SYNC_STEP_1, MessageType.SYNC_STEP_2]).toContain(
        decoded.type,
      );
      client.close();
      done();
    });
  });
});
