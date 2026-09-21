"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authService, doctorService, notificationService } from "@/lib/apiService";

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
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

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

  useEffect(() => {
    authService.me().then((doctor) => setStatus(doctor.doctorStatus));
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  async function toggleStatus() {
    const next = status === "online" ? "offline" : "online";
    try {
      await doctorService.updateStatus(next);
      setStatus(next);
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
              <li key={item.vitalsId} className="rounded border p-3">
                <strong>#{item.token}</strong> — {item.patientName}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}