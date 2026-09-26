"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authService, doctorService, notificationService } from "@/lib/apiService";
import { ConsultModal } from "../components/ConsultModal";
import { AndroidBridge } from "@/lib/AndroidBridge";

type QueueItem = {
  vitalsId: string;
  patientId: string;
  patientName: string;
  token: string;
  clinicId: string;
  tokenDate: string;
  createdAt: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"online" | "offline">("offline");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [completed, setCompleted] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompleted, setLoadingCompleted] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [consultItem, setConsultItem] = useState<QueueItem | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const data = await doctorService.getQueue();
      setQueue(data);
    } catch (err) {
      console.error("Queue fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompleted = useCallback(async () => {
    try {
      const data = await doctorService.getCompletedToday();
      setCompleted(data);
    } catch (err) {
      console.error("Completed fetch failed:", err);
    } finally {
      setLoadingCompleted(false);
    }
  }, []);

  useEffect(() => {
    authService.me().then((doctor) => setStatus(doctor.doctorStatus));
    fetchQueue();
    fetchCompleted();
    const interval = setInterval(() => {
      fetchQueue();
      fetchCompleted();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue, fetchCompleted]);

  async function toggleStatus() {
    const next = status === "online" ? "offline" : "online";
    try {
      await doctorService.updateStatus(next);
      setStatus(next);
      AndroidBridge.notifyDoctorStatus(next);
    } catch (err) {
      console.error("Status update failed:", err);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const fcmToken = localStorage.getItem("fcmToken");
      if (fcmToken) {
        await notificationService.removeFcmToken(fcmToken);
      }
      await authService.logout("Manual logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("doctorToken");
      localStorage.removeItem("doctor");
      localStorage.removeItem("fcmToken");
      router.replace("/login");
    }
  }

  return (
    <div>
      <header className="flex items-center justify-between p-4 border-b">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <div className="flex items-center gap-3">
          <button onClick={toggleStatus} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
            {status === "online" ? "Go Offline" : "Go Online (video calls)"}
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1 rounded border px-3 py-1.5 text-sm text-red-600 disabled:opacity-50"
          >
            <LogOut size={16} />
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </header>

      <section className="p-4">
        <h2 className="mb-2 font-medium">Patient Queue</h2>
        {loading ? (
          <p>Loading...</p>
        ) : queue.length === 0 ? (
          <p>No patients waiting.</p>
        ) : (
          <ul className="space-y-2">
            {queue.map((item) => (
              <li key={item.vitalsId} className="rounded border p-3 flex items-center justify-between">
                <div>
                  <strong>#{item.token}</strong> — {item.patientName}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setConsultItem(item)} className="text-xs px-2 py-1 rounded bg-[#0297d6] text-white">
                    Consult
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="p-4">
        <h2 className="mb-2 font-medium">Completed Today</h2>
        {loadingCompleted ? (
          <p>Loading...</p>
        ) : completed.length === 0 ? (
          <p>No completed consults today.</p>
        ) : (
          <ul className="space-y-2">
            {completed.map((item) => (
              <li key={item.vitalsId} className="rounded border p-3 flex items-center justify-between bg-slate-50">
                <div className="text-slate-500">
                  <strong>#{item.token}</strong> — {item.patientName}
                </div>
                <button onClick={() => setConsultItem(item)} className="text-xs px-2 py-1 rounded bg-slate-400 text-white hover:bg-slate-500">
                  Update
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {consultItem && (
        <ConsultModal
          patientId={consultItem.patientId}
          patientToken={consultItem.token}
          vitalsId={consultItem.vitalsId}
          onClose={() => {
            setConsultItem(null);
            fetchQueue();
            fetchCompleted();
          }}
        />
      )}
    </div>
  );
}