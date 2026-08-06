export type BatchEventPayload = Record<string, unknown>;

export type BatchEvent = {
  eventId: string;
  type: string;
  recordedAt: string;
  payload: BatchEventPayload;
};

export type BatchRequest = {
  deviceId: string;
  localSessionId: string;
  events: BatchEvent[];
};

export type BatchAcknowledgement = {
  serverSessionId: string;
  acknowledgedEventIds: string[];
  rejectedEvents: unknown[];
  serverReceivedAt: string;
};
