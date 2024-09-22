import _ from 'lodash';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'crit' | 'alert';
type EntryProcessor = (key: string, value: any) => any;

export class Logger {
  constructor() {
    return;
  }

  private static stringify(
    obj: unknown,
    replacer: EntryProcessor,
    spaces?: string | number,
    cycleReplacer?: EntryProcessor,
  ) {
    return JSON.stringify(obj, this.serializer(replacer, cycleReplacer), spaces);
  }

  private static serializer(replacer: EntryProcessor, cycleReplacer: EntryProcessor) {
    var stack = [],
      keys = [];

    if (cycleReplacer == null)
      cycleReplacer = function (_key, value) {
        if (stack[0] === value) return '[Circular ~]';
        return '[Circular ~.' + keys.slice(0, stack.indexOf(value)).join('.') + ']';
      };

    return function (key, value) {
      if (stack.length > 0) {
        var thisPos = stack.indexOf(this);
        ~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
        ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
        if (~stack.indexOf(value)) value = cycleReplacer.call(this, key, value);
      } else stack.push(value);

      return replacer == null ? value : replacer.call(this, key, value);
    };
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
      try {
        msg += this.stringify(message.log, null, 0);
      } catch (err) {
        console.log(
          this.stringify({ msg: 'Logger .log stringify error', level: 'warn', log: err, module: 'Logger' }, null, 0),
        );
        msg += message.log;
      }
    }
    return msg;
  }

  // TODO: Check intersections and store to additionals
  public static info(title: string, log?: any, module?: string) {
    const message = { title, module, log };
    Logger.log(message, 'info');
  }

  public static error(title: string, log?: any, module?: string) {
    const message = { title, module, log };
    Logger.log(message, 'error');
  }

  public static crit(title: string, log?: any, module?: string) {
    const message = { title, module, log };
    Logger.log(message, 'crit');
  }

  public static warn(title: string, log?: any, module?: string) {
    const message = { title, module, log };
    Logger.log(message, 'warn');
  }

  public static log(fields: Record<string, any>, level: LogLevel = 'info') {
    let message = _.omitBy(fields, (value) => (value ?? null) === null);
    message.level = level;
    message.msg = Logger.buildMsg(message);

    if (typeof message.log === 'object' && message.log !== null && !Array.isArray(message.log)) {
      message = { ...message, ...fields.log };
    } else {
      message.log = fields.log;
    }

    console.log(this.stringify(message, null, 0));
  }
}
