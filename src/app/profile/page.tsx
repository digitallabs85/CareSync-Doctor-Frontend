"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  Stethoscope,
  Mail,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { authService, doctorService } from "@/lib/apiService";

type Form = { name: string; phone: string; specialization: string };

export default function ProfilePage() {
  const router = useRouter();
  const [doctorId, setDoctorId] = useState("");
  const [form, setForm] = useState<Form>({ name: "", phone: "", specialization: "" });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const touched = useRef(false)

  useEffect(() => {
    if (!localStorage.getItem("doctorToken")) {
      router.replace("/login");
      return;
    }

    const fill = (d: any) => {
      setDoctorId(d.id);
      setEmail(d.email ?? "");
      setForm({
        name: `${d.firstName} ${d.lastName}`,
        phone: d.phone ?? "",
        specialization: d.specializations ?? "",
      });
    };

    // instant prefill from the doctor saved at login
    const cached = localStorage.getItem("doctor");
    if (cached) {
      try {
        fill(JSON.parse(cached));
        setLoading(false);
      } catch { }
    }

    // then refresh from the server
    authService
      .me()
      .then((doctor) => {
        console.log("doctor payload:", doctor); // check the real field names here
        localStorage.setItem("doctor", JSON.stringify(doctor));
        if (!touched.current) fill(doctor); // don't overwrite what the user is typing
      })
      .catch((err) => {
        console.error("Profile load failed:", err);
        setMessage({ type: "error", text: "Failed to load profile." });
      })
      .finally(() => setLoading(false));
  }, [router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    touched.current = true;
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Name is required." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await doctorService.updateProfile(doctorId, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        specialization: form.specialization.trim(),
      });
      const cached = localStorage.getItem("doctor");
      if (cached) {
        localStorage.setItem("doctor", JSON.stringify({ ...JSON.parse(cached), ...res.doctor }));
      }
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (err) {
      console.error("Profile update failed:", err);
      setMessage({ type: "error", text: "Update failed. Try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-skeuo-base">
      {/* ================= Header ================= */}
      <header className="sticky top-0 z-40 border-b border-skeuo-surface/60 bg-white/80 px-4 py-3 backdrop-blur-xl transition-all sm:px-6 sm:py-4 lg:px-8">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-4">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="grid h-10 w-10 place-items-center rounded-xl bg-skeuo-surface/50 text-skeuo-text transition-all hover:bg-skeuo-surface active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight text-skeuo-text leading-none">
              Update Profile
            </h1>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-skeuo-muted">
              Doctor Settings
            </p>
          </div>
        </div>
      </header>

      {/* ================= Main Content ================= */}
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="overflow-hidden rounded-[2rem] border border-skeuo-surface/60 bg-white shadow-sm">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-skeuo-muted">
              <Loader2 size={32} className="animate-spin text-skeuo-red" />
              <span className="text-sm font-bold uppercase tracking-widest">Loading Details...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 py-6 sm:px-8 sm:py-8 animate-fade-in">

              {/* Email (Disabled) */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-skeuo-muted">
                  Email Address (Read-only)
                </label>
                <div className="relative opacity-60">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted" />
                  <input
                    value={email}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border-2 border-transparent bg-skeuo-base py-3 pl-11 pr-4 text-sm font-bold text-skeuo-text"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-skeuo-muted">
                  Full Name
                </label>
                <div className="group relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted transition-colors group-focus-within:text-skeuo-red" />
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Dr. John Doe"
                    className="w-full rounded-xl border-2 border-skeuo-surface bg-skeuo-base/30 py-3 pl-11 pr-4 text-sm font-bold text-skeuo-text outline-none transition-all focus:border-skeuo-red focus:bg-white focus:ring-4 focus:ring-skeuo-red/10"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-skeuo-muted">
                  Phone Number
                </label>
                <div className="group relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted transition-colors group-focus-within:text-skeuo-red" />
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+1 234 567 890"
                    className="w-full rounded-xl border-2 border-skeuo-surface bg-skeuo-base/30 py-3 pl-11 pr-4 text-sm font-bold text-skeuo-text outline-none transition-all focus:border-skeuo-red focus:bg-white focus:ring-4 focus:ring-skeuo-red/10"
                  />
                </div>
              </div>

              {/* Specialization */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-skeuo-muted">
                  Specialization
                </label>
                <div className="group relative">
                  <Stethoscope size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted transition-colors group-focus-within:text-skeuo-red" />
                  <input
                    name="specialization"
                    value={form.specialization}
                    onChange={handleChange}
                    placeholder="General Physician, Cardiologist..."
                    className="w-full rounded-xl border-2 border-skeuo-surface bg-skeuo-base/30 py-3 pl-11 pr-4 text-sm font-bold text-skeuo-text outline-none transition-all focus:border-skeuo-red focus:bg-white focus:ring-4 focus:ring-skeuo-red/10"
                  />
                </div>
              </div>

              {/* Status Message */}
              {message && (
                <div className={`mt-2 flex items-center gap-2.5 rounded-xl border px-4 py-3 animate-fade-in ${message.type === "success"
                    ? "border-skeuo-green/30 bg-skeuo-green/5 text-skeuo-green"
                    : "border-rose-200 bg-rose-50 text-rose-600"
                  }`}>
                  {message.type === "success" ? <CheckCircle size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
                  <p className="text-sm font-bold">{message.text}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving || !doctorId}
                className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-skeuo-red py-4 text-sm font-black text-white shadow-md transition-all hover:bg-skeuo-red-dark hover:shadow-lg hover:shadow-skeuo-red/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} className="transition-transform group-hover:scale-110" />
                    <span>Save Profile</span>
                  </>
                )}
              </button>

            </form>
          )}
        </div>
      </main>
    </div>
  );
}