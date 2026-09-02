import { Server as HTTPServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "url";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { prisma } from "@/db/connection";
import { documentService } from "@/services/document.service";
import { decodeKey } from "@/utils/jwt";
import { redisWSAdapter } from "./redis-adapter";
import { snapshotWorker } from "@/workers/snapshot.worker";
import {
  MessageType,
  decodeMessage,
  encodeSyncStep1,
  encodeSyncStep2,
  encodeUpdate,
  encodeAwareness,
} from "@/websocket/protocol";

interface ExtendedWebSocket extends WebSocket {
  documentId?: string;
  userId?: string;
  isAlive?: boolean;
}

interface RoomState {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Set<ExtendedWebSocket>;
}

export class CollaborativeWebSocketServer {
  private wss: WebSocketServer;
  private rooms: Map<string, RoomState> = new Map();

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({
      noServer: true,
      handleProtocols: () => "access_token",
    });

    server.on("upgrade", async (request: IncomingMessage, socket, head) => {
      const { pathname, searchParams } = new URL(
        request.url || "",
        `http://${request.headers.host}`,
      );

      if (pathname === "/ws/documents") {
        const documentId = searchParams.get("documentId");
        const token = this.extractTokenFromSubprotocol(request);

        if (!token || !documentId) {
          const response = Buffer.from(
            "HTTP/1.1 401 Unauthorized\r\nContent-Type: text/plain\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
          );
          socket.write(response);
          socket.end();
          return;
        }

        try {
          const decoded = decodeKey(token);
          const existingDocument = await prisma.document.findUnique({
            where: { id: documentId },
            select: { id: true },
          });

          if (existingDocument) {
            const hasAccess = await prisma.document.findFirst({
              where: {
                id: documentId,
                OR: [
                  { ownerId: decoded.userId },
                  { members: { some: { userId: decoded.userId } } },
                ],
              },
              select: { id: true },
            });

            if (!hasAccess) {
              const response = Buffer.from(
                "HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
              );
              socket.write(response);
              socket.end();
              return;
            }
          }

          this.wss.handleUpgrade(request, socket, head, (ws) => {
            const client = ws as ExtendedWebSocket;
            client.documentId = documentId;
            client.userId = decoded.userId;
            client.isAlive = true;
            this.wss.emit("connection", client);
          });
        } catch {
          const response = Buffer.from(
            "HTTP/1.1 401 Unauthorized\r\nContent-Type: text/plain\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
          );
          socket.write(response);
          socket.end();
        }
      } else {
        socket.destroy();
      }
    });

    this.init();
  }

  private extractTokenFromSubprotocol(request: IncomingMessage): string | null {
    const subprotocolHeader = request.headers["sec-websocket-protocol"];
    if (!subprotocolHeader) return null;
    const protocols = subprotocolHeader.split(",").map((p) => p.trim());
    const tokenIndex = protocols.indexOf("access_token");
    return tokenIndex !== -1 && protocols[tokenIndex + 1]
      ? protocols[tokenIndex + 1]
      : null;
  }

  private init(): void {
    redisWSAdapter.onRemoteMessage((documentId, type, payload) => {
      const room = this.rooms.get(documentId);
      if (!room) return;

      if (type === "CRDT_UPDATE") {
        Y.applyUpdate(room.doc, payload, "redis-remote");
        this.broadcastToRoom(documentId, null, encodeUpdate(payload));
      } else if (type === "AWARENESS_UPDATE") {
        awarenessProtocol.applyAwarenessUpdate(
          room.awareness,
          payload,
          "redis-remote",
        );
        this.broadcastToRoom(documentId, null, encodeAwareness(payload));
      }
    });

    this.wss.on("connection", async (ws: ExtendedWebSocket) => {
      const { documentId, userId } = ws;
      if (!documentId || !userId) return ws.close(1008, "Missing params");

      const room = await this.getOrCreateRoom(documentId);
      room.clients.add(ws);
      await redisWSAdapter.subscribeToRoom(documentId);

      // Send initial sync state vector for client to request diff
      const serverStateVector = Y.encodeStateVector(room.doc);
      ws.send(encodeSyncStep1(serverStateVector), { binary: true });

      ws.on("message", async (data: Buffer) => {
        const payload = new Uint8Array(data);
        const { type, data: msgData } = decodeMessage(payload);

        switch (type) {
          case MessageType.SYNC_STEP_1: {
            const diff = Y.encodeStateAsUpdate(room.doc, msgData);
            ws.send(encodeSyncStep2(diff), { binary: true });
            break;
          }
          case MessageType.SYNC_STEP_2:
          case MessageType.UPDATE: {
            Y.applyUpdate(room.doc, msgData, ws);
            this.broadcastToRoom(documentId, ws, encodeUpdate(msgData));
            await redisWSAdapter.publishToRoom(
              documentId,
              "CRDT_UPDATE",
              msgData,
            );
            break;
          }
          case MessageType.AWARENESS: {
            awarenessProtocol.applyAwarenessUpdate(room.awareness, msgData, ws);
            break;
          }
        }
      });

      ws.on("close", async () => {
        room.clients.delete(ws);
        if (room.clients.size === 0) {
          room.awareness.destroy();
          this.rooms.delete(documentId);
          await redisWSAdapter.unsubscribeFromRoom(documentId);
          snapshotWorker.processDocument(documentId).catch(console.error);
        }
      });
    });
  }

  private async getOrCreateRoom(documentId: string): Promise<RoomState> {
    let room = this.rooms.get(documentId);
    if (room) return room;

    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);

    const content = await documentService.getDocumentContent(documentId);
    if (content?.baseSnapshot) {
      Y.applyUpdate(doc, Buffer.from(content.baseSnapshot, "base64"));
    }
    content?.crdtUpdates?.forEach((update) => {
      Y.applyUpdate(doc, update);
    });

    doc.on("update", (update: Uint8Array, origin: any) => {
      if (origin !== "redis-remote") {
        documentService
          .applyCRDTUpdate(documentId, "system", update)
          .catch(console.error);
      }
    });

    awareness.on("update", ({ added, updated, removed }: any, origin: any) => {
      if (origin === "redis-remote") return;
      const changed = added.concat(updated, removed);
      const update = awarenessProtocol.encodeAwarenessUpdate(
        awareness,
        changed,
      );
      const frame = encodeAwareness(update);

      this.broadcastToRoom(
        documentId,
        origin instanceof WebSocket ? origin : null,
        frame,
      );
      redisWSAdapter.publishToRoom(documentId, "AWARENESS_UPDATE", update);
    });

    room = { doc, awareness, clients: new Set() };
    this.rooms.set(documentId, room);
    return room;
  }

  private broadcastToRoom(
    documentId: string,
    sender: ExtendedWebSocket | null,
    payload: Uint8Array,
  ): void {
    const room = this.rooms.get(documentId);
    if (!room) return;

    room.clients.forEach((client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(payload, { binary: true });
      }
    });
  }
}
