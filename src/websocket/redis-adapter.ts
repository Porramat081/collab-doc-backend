import Redis from "ioredis";

export type RedisMessageType = "CRDT_UPDATE" | "AWARENESS_UPDATE";

export type RemoteMessageCallback = (
  documentId: string,
  type: RedisMessageType,
  payload: Uint8Array,
) => void;

export class RedisWSAdapter {
  private pubClient: Redis;
  private subClient: Redis;
  private messageCallback: RemoteMessageCallback | null = null;
  private subscribedChannels: Set<string> = new Set();

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    // Separate Redis clients required for Pub and Sub modes
    this.pubClient = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.subClient = new Redis(redisUrl, { maxRetriesPerRequest: null });

    this.initSubscriber();
  }

  /**
   * Initializes subClient listener to parse incoming binary frames from other server nodes.
   */
  private initSubscriber(): void {
    // Enable binary mode for buffer delivery
    this.subClient.on(
      "messageBuffer",
      (channelBuffer: Buffer, messageBuffer: Buffer) => {
        const channel = channelBuffer.toString("utf-8");

        if (!channel.startsWith("doc:")) return;

        const documentId = channel.replace("doc:", "");

        // Extract header metadata: [0] = message type byte
        const type: RedisMessageType =
          messageBuffer[0] === 1 ? "CRDT_UPDATE" : "AWARENESS_UPDATE";

        // Extract original binary payload
        const payload = new Uint8Array(messageBuffer.subarray(1));

        if (this.messageCallback) {
          this.messageCallback(documentId, type, payload);
        }
      },
    );
  }

  /**
   * Registers callback handler for messages arriving from remote server instances.
   */
  public onRemoteMessage(callback: RemoteMessageCallback): void {
    this.messageCallback = callback;
  }

  /**
   * Subscribes local server instance to a document channel if not already subscribed.
   */
  public async subscribeToRoom(documentId: string): Promise<void> {
    const channel = `doc:${documentId}`;
    if (!this.subscribedChannels.has(channel)) {
      await this.subClient.subscribe(channel);
      this.subscribedChannels.add(channel);
    }
  }

  /**
   * Unsubscribes local server instance when all local connections to a room disconnect.
   */
  public async unsubscribeFromRoom(documentId: string): Promise<void> {
    const channel = `doc:${documentId}`;
    if (this.subscribedChannels.has(channel)) {
      await this.subClient.unsubscribe(channel);
      this.subscribedChannels.delete(channel);
    }
  }

  /**
   * Publishes binary CRDT or Awareness updates to all cluster nodes.
   */
  public async publishToRoom(
    documentId: string,
    type: RedisMessageType,
    payload: Uint8Array,
  ): Promise<void> {
    const channel = `doc:${documentId}`;

    // Construct packed Buffer: [1 byte type flag] + [payload]
    const packet = Buffer.alloc(1 + payload.length);
    packet[0] = type === "CRDT_UPDATE" ? 1 : 2;
    packet.set(payload, 1);

    await this.pubClient.publish(channel, packet);
  }
}

export const redisWSAdapter = new RedisWSAdapter();
