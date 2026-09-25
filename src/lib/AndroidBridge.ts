declare global {
  interface Window {
    CallAction?: {
      postMessage: (message: string) => void;
    };
    AuthReady?: {
      postMessage: (message: string) => void;
    };
    DoctorStatus?: {
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

function notifyDoctorStatus(status: "online" | "offline"): void {
  if (typeof window !== "undefined" && window.DoctorStatus) {
    window.DoctorStatus.postMessage(status);
  }
}

export const AndroidBridge = {
  isAvailable: isAndroidBridgeAvailable,
  notifyCallEnded,
  notifyLoggedIn,
  notifyDoctorStatus,
};