export class BotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BotError';
  }
}
