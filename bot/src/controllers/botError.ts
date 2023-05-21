export class BotError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'BotError';
  }

  static INTERRUPTED = new BotError('Interrupted');
  static BALANCE_LOW = new BotError('You have insufficient funds in your account.');
}
