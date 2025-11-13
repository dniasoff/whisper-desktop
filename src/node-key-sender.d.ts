declare module 'node-key-sender' {
  interface KeySender {
    send(key: string): Promise<void>;
  }

  export const key: KeySender;
}
