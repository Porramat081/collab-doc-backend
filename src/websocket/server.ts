import { Server as HTTPServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "url";
import { documentService } from "../services";
import { decodeKey } from "../utils/jwt";

interface ExtendedWebSocket extends WebSocket {
  documentId?: string;
  userId?: string;
  isAlive?: boolean;
}

export class CollaborativeWebSocketServer {
  private wss: WebSocketServer;
  private rooms: Map<string, Set<ExtendedWebSocket>> = new Map();

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request: IncomingMessage, socket, head) => {
      const { pathname, searchParams } = new URL(
        request.url || "",
        `http://${request.headers.host}`,
      );

      if (pathname === "/ws/documents") {
        const documentId = searchParams.get("documentId");

        const token = this.extractTokenFromSubprotocol(request);

        if (!token || !documentId) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        try {
          const decoded = decodeKey(token);
          this.wss.handleUpgrade(request, socket, head, (ws) => {
            const client = ws as ExtendedWebSocket;
            client.documentId = documentId;
            client.userId = decoded.userId;
            client.isAlive = true;
            this.wss.emit("connection", client);
          });
        } catch (err) {
          console.error(
            "WebSocket Authentication Failed:",
            (err as Error).message,
          );
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
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

    // Subprotocol format sent by client: "access_token, <JWT_TOKEN>"
    const protocols = subprotocolHeader.split(",").map((p) => p.trim());
    const tokenIndex = protocols.indexOf("access_token");

    if (tokenIndex !== -1 && protocols[tokenIndex + 1]) {
      return protocols[tokenIndex + 1];
    }

    return null;
  }

  private init(): void {
    // Heartbeat mechanism to clean up dead connections
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const client = ws as ExtendedWebSocket;
        if (client.isAlive === false) return client.terminate();
        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    this.wss.on("close", () => clearInterval(interval));

    this.wss.on("connection", (ws: ExtendedWebSocket) => {
      ws.on("pong", () => {
        ws.isAlive = true;
      });

      const { documentId, userId } = ws;
      if (!documentId || !userId) return ws.close(1008, "Missing parameters");

      // Join document room
      if (!this.rooms.has(documentId)) {
        this.rooms.set(documentId, new Set());
      }
      this.rooms.get(documentId)!.add(ws);

      // Handle incoming messages (Binary CRDT Updates)
      ws.on(
        "message",
        async (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
          if (!isBinary) return; // Only process binary CRDT payloads

          try {
            const updateBlob = new Uint8Array(data as Buffer);
            // 1. Persist the CRDT update in MongoDB via Service Layer
            await documentService.applyCRDTUpdate(
              documentId,
              userId,
              updateBlob,
            );

            // 2. Broadcast update to all other connected clients in the room
            this.broadcastToRoom(documentId, ws, updateBlob);
          } catch (error) {
            console.error(
              `Failed to process CRDT update for document ${documentId}:`,
              error,
            );
            ws.send(JSON.stringify({ error: "Failed to process update" }));
          }
        },
      );

      // Handle client disconnect
      ws.on("close", () => {
        const room = this.rooms.get(documentId);
        if (room) {
          room.delete(ws);
          if (room.size === 0) {
            this.rooms.delete(documentId);
          }
        }
      });
    });
  }

  private broadcastToRoom(
    documentId: string,
    sender: ExtendedWebSocket,
    payload: Uint8Array,
  ): void {
    const room = this.rooms.get(documentId);
    if (!room) return;

    room.forEach((client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(payload, { binary: true });
      }
    });
  }
}
