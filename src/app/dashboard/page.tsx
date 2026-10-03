"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Users, CheckCircle, Activity, BellOff, RefreshCw, Pill, Search, X } from "lucide-react";
import { authService, doctorService } from "@/lib/apiService";
import { ConsultModal } from "../components/ConsultModal";
import Navbar from "../components/Navbar";

type QueueItem = {
  vitalsId: string;
  patientId: string;
  patientName: string;
  token: string;
  phone?: string;
  mrNumber?: string;
  clinicId: string;
  tokenDate: string;
  createdAt: string;
};

interface SectionProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

type SearchField = "token" | "phone" | "mrNumber";

const SEARCH_FIELDS: { key: SearchField; label: string; placeholder: string }[] = [
  { key: "token", label: "Token", placeholder: "Search by token..." },
  { key: "phone", label: "Phone", placeholder: "Search by phone..." },
  { key: "mrNumber", label: "MR #", placeholder: "Search by MR number..." },
];

const matchesSearch = (item: QueueItem, field: SearchField, term: string) => {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  const value = String(item[field] ?? "").toLowerCase();
  return field === "token" ? value.includes(q) : value === q;
};

const Section: React.FC<SectionProps> = ({
  icon,
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}) => (
  <section className={`overflow-hidden rounded-2xl border border-skeuo-surface bg-white shadow-sm ${className ?? ""}`}>
    <div className="flex gap-2 border-b border-skeuo-surface px-3 py-3 items-center justify-between sm:px-5 sm:py-4">
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-skeuo-red text-white">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-skeuo-text">{title}</h2>
          {subtitle && <p className="text-sm text-skeuo-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    <div className={`p-3 sm:p-6 lg:p-8 ${bodyClassName ?? ""}`}>{children}</div>
  </section>
);

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"online" | "offline">("offline");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [completed, setCompleted] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompleted, setLoadingCompleted] = useState(true);
  const [consultItem, setConsultItem] = useState<QueueItem | null>(null);
  const [notificationsBlocked, setNotificationsBlocked] = useState(false);
  const [queueField, setQueueField] = useState<SearchField>("token");
  const [queueTerm, setQueueTerm] = useState("");
  const [completedField, setCompletedField] = useState<SearchField>("token");
  const [completedTerm, setCompletedTerm] = useState("");

  const filteredQueue = queue.filter((i) => matchesSearch(i, queueField, queueTerm));
  const filteredCompleted = completed.filter((i) => matchesSearch(i, completedField, completedTerm));

  useEffect(() => {
    if (!("Notification" in window)) return;

    let permissionStatus: PermissionStatus | null = null;

    async function checkPermission() {
      if (Notification.permission === "default") {
        const result = await Notification.requestPermission();
        setNotificationsBlocked(result === "denied");
      } else {
        setNotificationsBlocked(Notification.permission === "denied");
      }

      if ("permissions" in navigator) {
        try {
          permissionStatus = await navigator.permissions.query({ name: "notifications" as PermissionName });
          permissionStatus.onchange = () => {
            setNotificationsBlocked(permissionStatus!.state === "denied");
          };
        } catch (err) {
          console.error("Permissions API query failed:", err);
        }
      }
    }

    checkPermission();

    return () => {
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const data = await doctorService.getQueue();
      setQueue((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data));
    } catch (err) {
      console.error("Queue fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompleted = useCallback(async () => {
    try {
      const data = await doctorService.getCompletedToday();
      setCompleted((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data));
    } catch (err) {
      console.error("Completed fetch failed:", err);
    } finally {
      setLoadingCompleted(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("doctorToken");
    if (!token) {
      router.replace("/login");
      return;
    }

    authService.me()
      .then((doctor) => setStatus(doctor.doctorStatus))
      .catch((err) => {
        console.error("Auth check failed, redirecting to login:", err);
        localStorage.removeItem("doctorToken");
        localStorage.removeItem("doctor");
        router.replace("/login");
      });

    fetchQueue();
    fetchCompleted();
    const interval = setInterval(() => {
      fetchQueue();
      fetchCompleted();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue, fetchCompleted, router]);

  return (
    <div className="min-h-screen bg-skeuo-base">

      {/* ================= Extracted Navbar ================= */}
      <Navbar status={status} setStatus={setStatus} />

      {/* ================= Main Layout ================= */}
      <main className="mx-auto w-full max-w-7xl grid grid-cols-1 gap-4 px-2 py-4 sm:gap-6 sm:px-6 sm:py-8 lg:grid-cols-[1fr_400px] lg:px-8">

        {/* ================= Left Column: Active Queue ================= */}
        <div className="flex flex-col gap-4 sm:gap-6">
          <Section
            icon={<Users className="h-5 w-5" />}
            title="Active Patient Queue"
            subtitle={`${filteredQueue.length} patient${filteredQueue.length !== 1 ? "s" : ""} waiting`}
            action={
              <button onClick={fetchQueue} disabled={loading} className="rounded-lg p-1.5 sm:p-2 text-skeuo-muted transition-colors hover:bg-skeuo-surface hover:text-skeuo-text">
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
            }
          >
            <div className="flex flex-col gap-4">
              {/* Queue search */}
              <div className="flex flex-col gap-2 rounded-xl border border-skeuo-surface bg-white p-2 sm:flex-row sm:items-center">
                <div className="flex shrink-0 gap-1 rounded-lg bg-skeuo-base p-1">
                  {SEARCH_FIELDS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setQueueField(f.key)}
                      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${queueField === f.key ? "bg-skeuo-red text-white" : "text-skeuo-muted hover:text-skeuo-text"
                        }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-1 items-center gap-2 px-2">
                  <Search size={18} className="shrink-0 text-skeuo-muted" />
                  <input
                    value={queueTerm}
                    onChange={(e) => setQueueTerm(e.target.value)}
                    placeholder={SEARCH_FIELDS.find((f) => f.key === queueField)!.placeholder}
                    className="h-10 w-full bg-transparent text-base text-skeuo-text outline-none placeholder:text-skeuo-muted"
                  />
                  {queueTerm && (
                    <button onClick={() => setQueueTerm("")} className="shrink-0 rounded-lg p-1.5 text-skeuo-muted hover:bg-skeuo-surface hover:text-skeuo-text">
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8 sm:py-12 text-base text-skeuo-muted">
                  <span className="h-6 w-6 sm:h-7 sm:w-7 animate-spin rounded-full border-2 border-skeuo-red border-t-transparent" />
                  Loading queue...
                </div>
              ) : filteredQueue.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-skeuo-surface bg-skeuo-base/50 py-8 sm:py-16 text-center text-base text-skeuo-muted">
                  <Activity size={32} className="opacity-20" />
                  {queueTerm ? "No matching patients." : "No patients currently waiting."}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 sm:gap-3 animate-fade-in">
                  {filteredQueue.map((item) => (
                    <div key={item.vitalsId} className="flex items-center justify-between rounded-xl border border-skeuo-surface bg-white p-3 sm:p-4 transition-all hover:border-skeuo-red/30 hover:shadow-md">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="grid h-12 w-12 sm:h-14 sm:w-14 shrink-0 place-items-center rounded-full bg-skeuo-red/10 text-lg sm:text-xl font-black text-skeuo-red">
                          {item.token}
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <p className="truncate text-base sm:text-lg font-bold text-skeuo-text">{item.patientName}</p>
                          <p className="text-xs sm:text-sm font-medium text-skeuo-muted">
                            Added: {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setConsultItem(item)}
                        className="group flex h-10 sm:h-11 shrink-0 items-center gap-1.5 sm:gap-2 rounded-lg bg-skeuo-red px-4 text-sm sm:text-base font-bold text-white transition-all hover:bg-skeuo-red-dark hover:shadow-lg hover:shadow-skeuo-red/20"
                      >
                        <Pill size={16} />
                        <span className="hidden sm:inline">Start Consult</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* ================= Right Column: Completed Today ================= */}
        <div className="flex flex-col gap-4 sm:gap-6">
          <Section
            icon={<CheckCircle className="h-5 w-5" />}
            title="Completed Today"
            subtitle={`${filteredCompleted.length} consult${filteredCompleted.length !== 1 ? "s" : ""} finished`}
            className="h-full"
            bodyClassName="h-full flex flex-col"
            action={
              <button onClick={fetchCompleted} disabled={loadingCompleted} className="rounded-lg p-1.5 sm:p-2 text-skeuo-muted transition-colors hover:bg-skeuo-surface hover:text-skeuo-text">
                <RefreshCw size={18} className={loadingCompleted ? "animate-spin" : ""} />
              </button>
            }
          >
            <div className="flex h-full flex-col gap-4">
              {/* Completed search */}
              <div className="flex flex-col gap-2 rounded-xl border border-skeuo-surface bg-white p-2 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
                <div className="flex shrink-0 gap-1 rounded-lg bg-skeuo-base p-1">
                  {SEARCH_FIELDS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setCompletedField(f.key)}
                      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${completedField === f.key ? "bg-skeuo-red text-white" : "text-skeuo-muted hover:text-skeuo-text"
                        }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-1 items-center gap-2 px-2">
                  <Search size={18} className="shrink-0 text-skeuo-muted" />
                  <input
                    value={completedTerm}
                    onChange={(e) => setCompletedTerm(e.target.value)}
                    placeholder={SEARCH_FIELDS.find((f) => f.key === completedField)!.placeholder}
                    className="h-10 w-full bg-transparent text-base text-skeuo-text outline-none placeholder:text-skeuo-muted"
                  />
                  {completedTerm && (
                    <button onClick={() => setCompletedTerm("")} className="shrink-0 rounded-lg p-1.5 text-skeuo-muted hover:bg-skeuo-surface hover:text-skeuo-text">
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              {loadingCompleted ? (
                <div className="flex flex-col gap-2.5 sm:gap-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl border border-skeuo-surface p-3 sm:p-4">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-skeuo-surface" />
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="h-4 w-3/4 rounded bg-skeuo-surface" />
                        <div className="h-3 w-1/2 rounded bg-skeuo-surface/60" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredCompleted.length === 0 ? (
                <div className="flex py-8 sm:py-16 flex-col items-center justify-center rounded-xl border border-dashed border-skeuo-surface bg-skeuo-base/50 text-center text-base text-skeuo-muted">
                  {completedTerm ? "No matching consults." : "No completed consults yet today."}
                </div>
              ) : (
                <div className="flex flex-col gap-2 animate-fade-in">
                  {filteredCompleted.map((item) => (
                    <div key={item.vitalsId} className="flex items-center justify-between rounded-xl border border-skeuo-surface bg-skeuo-base/30 p-2.5 sm:p-3 transition-colors hover:bg-white">
                      <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
                        <div className="grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-skeuo-surface text-sm sm:text-base font-black text-skeuo-muted">
                          {item.token}
                        </div>
                        <p className="truncate text-sm sm:text-base font-bold text-skeuo-text">{item.patientName}</p>
                      </div>
                      <button
                        onClick={() => setConsultItem(item)}
                        className="ml-2 shrink-0 rounded-lg border border-skeuo-surface bg-white px-3 py-2 text-xs sm:text-sm font-bold text-skeuo-muted transition-colors hover:border-skeuo-text hover:text-skeuo-text"
                      >
                        Update
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </div>
      </main>

      {/* ================= Consult Modal ================= */}
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

      {/* ================= Notifications Blocked Alert ================= */}
      {notificationsBlocked && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-fade-in">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-skeuo-red/10 px-4 py-5 sm:px-6 sm:py-6 text-center">
              <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white text-skeuo-red shadow-sm">
                <BellOff size={28} />
              </div>
              <h2 className="mt-3 sm:mt-4 text-xl sm:text-2xl font-black text-skeuo-text">Notifications Blocked</h2>
              <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-skeuo-muted">
                You will not hear ringing when patients call.
              </p>
            </div>
            <div className="bg-skeuo-base px-4 py-4 sm:px-6 sm:py-5 text-sm sm:text-base text-skeuo-text">
              <p className="font-semibold mb-2">How to fix this:</p>
              <ol className="list-decimal pl-5 space-y-1.5 text-skeuo-muted">
                <li>Click the <strong>🔒 icon</strong> in your browser address bar.</li>
                <li>Find the <strong>Notifications</strong> setting.</li>
                <li>Change it from Block to <strong>Allow</strong>.</li>
                <li>Refresh this page.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}