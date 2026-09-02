import { Redis, type RedisOptions } from "ioredis";
import { env } from "../config/env.js";

export type RedisMessageType = "CRDT_UPDATE" | "AWARENESS_UPDATE";

export type RemoteMessageCallback = (
  documentId: string,
  type: RedisMessageType,
  payload: Uint8Array,
) => void;

export class RedisWSAdapter {
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private messageCallback: RemoteMessageCallback | null = null;
  private subscribedChannels: Set<string> = new Set();

  /** True when REDIS_URL is configured; false means single-instance mode. */
  public readonly enabled: boolean;

  constructor() {
    this.enabled = Boolean(env.REDIS_URL);

    if (!this.enabled) {
      console.warn(
        "[Redis] REDIS_URL is not set - running in single-instance mode. " +
          "Cross-instance CRDT fan-out is disabled; add a Redis service before scaling replicas.",
      );
      return;
    }

    const options: RedisOptions = {
      // Never give up: a Railway Redis service can restart independently of the app.
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      // ioredis defaults to family 4; Railway's *.railway.internal hosts are IPv6-only.
      family: env.REDIS_FAMILY,
      retryStrategy: (times) => Math.min(times * 200, 5_000),
      lazyConnect: false,
    };

    // Pub/Sub requires two connections: a subscribed client cannot issue commands.
    this.pubClient = new Redis(env.REDIS_URL!, options);
    this.subClient = new Redis(env.REDIS_URL!, options);

    this.pubClient.on("error", (err) => console.error("[Redis:pub]", err.message));
    this.subClient.on("error", (err) => console.error("[Redis:sub]", err.message));
    this.pubClient.on("ready", () => console.log("[Redis] Publisher ready"));
    this.subClient.on("ready", () => {
      console.log("[Redis] Subscriber ready");
      // Re-subscribe after a reconnect, otherwise rooms silently stop syncing.
      for (const channel of this.subscribedChannels) {
        this.subClient?.subscribe(channel).catch((err) =>
          console.error(`[Redis] Failed to resubscribe to ${channel}:`, err),
        );
      }
    });

    this.initSubscriber();
  }

  /**
   * Initializes subClient listener to parse incoming binary frames from other server nodes.
   */
  private initSubscriber(): void {
    // Enable binary mode for buffer delivery
    this.subClient?.on(
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
    if (!this.subClient) return;

    const channel = `doc:${documentId}`;
    if (this.subscribedChannels.has(channel)) return;

    this.subscribedChannels.add(channel);
    try {
      await this.subClient.subscribe(channel);
    } catch (err) {
      // Keep the channel recorded so the "ready" handler retries after reconnect.
      console.error(`[Redis] subscribe(${channel}) failed:`, err);
    }
  }

  /**
   * Unsubscribes local server instance when all local connections to a room disconnect.
   */
  public async unsubscribeFromRoom(documentId: string): Promise<void> {
    if (!this.subClient) return;

    const channel = `doc:${documentId}`;
    if (!this.subscribedChannels.delete(channel)) return;

    try {
      await this.subClient.unsubscribe(channel);
    } catch (err) {
      console.error(`[Redis] unsubscribe(${channel}) failed:`, err);
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
    if (!this.pubClient) return;

    const channel = `doc:${documentId}`;

    // Construct packed Buffer: [1 byte type flag] + [payload]
    const packet = Buffer.alloc(1 + payload.length);
    packet[0] = type === "CRDT_UPDATE" ? 1 : 2;
    packet.set(payload, 1);

    try {
      await this.pubClient.publish(channel, packet);
    } catch (err) {
      console.error(`[Redis] publish(${channel}) failed:`, err);
    }
  }

  /** Health probe used by /health/ready. */
  public async ping(): Promise<boolean> {
    if (!this.pubClient) return false;
    try {
      return (await this.pubClient.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  public async close(): Promise<void> {
    await Promise.allSettled([
      this.pubClient?.quit(),
      this.subClient?.quit(),
    ]);
    this.pubClient = null;
    this.subClient = null;
    this.subscribedChannels.clear();
  }
}

export const redisWSAdapter = new RedisWSAdapter();
