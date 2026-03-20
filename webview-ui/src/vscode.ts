declare function acquireVsCodeApi(): {
  postMessage(msg: any): void;
  getState(): any;
  setState(state: any): void;
};

export const vscode = acquireVsCodeApi();

export function post(type: string, data?: Record<string, any>) {
  vscode.postMessage({ type, ...data });
}
