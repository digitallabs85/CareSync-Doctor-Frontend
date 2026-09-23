declare global {
  interface Window {
    CallAction?: {
      postMessage: (message: string) => void;
    };
    AuthReady?: {
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

function notifyLoggedIn(): void {
  if (typeof window !== "undefined" && window.AuthReady) {
    window.AuthReady.postMessage("logged_in");
  }
}

export const AndroidBridge = {
  isAvailable: isAndroidBridgeAvailable,
  notifyCallEnded,
  notifyLoggedIn,
};