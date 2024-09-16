import _ from 'lodash';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'crit' | 'alert';

export class Logger {
  constructor() {
    return;
  }

  private static buildMsg(message: any): string {
    let msg = '';
    if (!message) {
      return null;
    }
    if (message.module) {
      msg += `[${message.module}] `;
    }
    if (message.title) {
      msg += message.title;
    }
    if (message.log) {
      msg += ' ';
      msg += JSON.stringify(message.log, null, 0);
    }
    return msg;
  }

  // TODO: Check intersections and store to additionals
  public static info(title: string, log?: any, module?: string) {
    const message = { title, module, ...log };
    Logger.log(message, 'info');
  }

  public static error(title: string, log?: any, module?: string) {
    const message = { title, module, ...log };
    Logger.log(message, 'error');
  }

  public static crit(title: string, log?: any, module?: string) {
    const message = { title, module, ...log };
    Logger.log(message, 'crit');
  }

  public static warn(title: string, log?: any, module?: string) {
    const message = { title, module, ...log };
    Logger.log(message, 'warn');
  }

  public static log(fields: Record<string, any>, level: LogLevel = 'info') {
    const message = _.omitBy(fields, (value) => (value ?? null) === null);
    message.level = level;
    message.msg = Logger.buildMsg(message);
    console.log(JSON.stringify(message, null, 0));
  }
}