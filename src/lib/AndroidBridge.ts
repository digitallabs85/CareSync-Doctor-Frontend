declare global {
  interface Window {
    CallAction?: {
      postMessage: (message: string) => void;
    };
  }
}

function isAndroidBridgeAvailable(): boolean {
  return typeof window !== "undefined" && !!window.CallAction;
}

function notifyCallEnded(): void {
  if (isAndroidBridgeAvailable()) {
    window.CallAction!.postMessage("call_ended");
  }
}

export const AndroidBridge = {
  isAvailable: isAndroidBridgeAvailable,
  notifyCallEnded,
};