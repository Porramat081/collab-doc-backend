import { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "url";
import { documentService } from "../services";

interface ExtendedWebSocket extends WebSocket {
  documentId?: string;
  userId?: string;
  isAlive?: boolean;
}

export class CollaborativeWebSocketServer {
  private wss: WebSocketServer;
  // Map of documentId -> Set of active client sockets
  private rooms: Map<string, Set<ExtendedWebSocket>> = new Map();

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ noServer: true });

    // Handle upgrade requests from the shared HTTP server
    server.on("upgrade", (request, socket, head) => {
      const { pathname, searchParams } = new URL(
        request.url || "",
        `http://${request.headers.host}`,
      );

      if (pathname === "/ws/documents") {
        const documentId = searchParams.get("documentId");
        const userId =
          (request.headers["x-user-id"] as string) ||
          searchParams.get("userId");

        if (!documentId || !userId) {
          socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
          socket.destroy();
          return;
        }

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          const client = ws as ExtendedWebSocket;
          client.documentId = documentId;
          client.userId = userId;
          client.isAlive = true;
          this.wss.emit("connection", client);
        });
      } else {
        socket.destroy();
      }
    });

    this.init();
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

      console.log(`User ${userId} connected to document room ${documentId}`);

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
        console.log(`User ${userId} left document room ${documentId}`);
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
