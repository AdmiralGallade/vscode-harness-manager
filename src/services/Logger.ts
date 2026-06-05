import * as vscode from 'vscode';

type Level = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export class Logger {
  private static _instance: Logger | undefined;
  private readonly _channel: vscode.OutputChannel;
  private _startTime = Date.now();

  private constructor() {
    this._channel = vscode.window.createOutputChannel('Harness Manager');
  }

  static get instance(): Logger {
    if (!Logger._instance) { Logger._instance = new Logger(); }
    return Logger._instance;
  }

  static dispose(): void {
    Logger._instance?._channel.dispose();
    Logger._instance = undefined;
  }

  // Show the output panel
  show(): void { this._channel.show(true); }

  debug(scope: string, msg: string, data?: unknown): void { this._write('DEBUG', scope, msg, data); }
  info (scope: string, msg: string, data?: unknown): void { this._write('INFO',  scope, msg, data); }
  warn (scope: string, msg: string, data?: unknown): void { this._write('WARN',  scope, msg, data); }
  error(scope: string, msg: string, err?: unknown): void  {
    let detail = '';
    if (err instanceof Error) {
      detail = `\n  ${err.message}${err.stack ? '\n  ' + err.stack.split('\n').slice(1).join('\n  ') : ''}`;
    } else if (err !== undefined) {
      detail = `\n  ${JSON.stringify(err)}`;
    }
    this._write('ERROR', scope, msg + detail);
  }

  private _write(level: Level, scope: string, msg: string, data?: unknown): void {
    const elapsed = ((Date.now() - this._startTime) / 1000).toFixed(3);
    const prefix  = `[${elapsed}s] [${level.padEnd(5)}] [${scope}]`;
    const line    = data !== undefined
      ? `${prefix} ${msg} ${JSON.stringify(data, null, 0)}`
      : `${prefix} ${msg}`;
    this._channel.appendLine(line);
    if (level === 'ERROR' || level === 'WARN') {
      console[level === 'ERROR' ? 'error' : 'warn'](line);
    }
  }
}

// Convenience shorthand used across the codebase
export const log = Logger.instance;
