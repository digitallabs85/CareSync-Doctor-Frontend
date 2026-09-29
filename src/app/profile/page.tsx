"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
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

  useEffect(() => {
    if (!localStorage.getItem("doctorToken")) {
      router.replace("/login");
      return;
    }
    authService
      .me()
      .then((doctor) => {
        setDoctorId(doctor.id);
        setForm({
          name: doctor.name ?? "",
          phone: doctor.phone ?? "",
          specialization: doctor.specialization ?? "",
        });
        setEmail(doctor.email ?? "");
      })
      .catch((err) => {
        console.error("Profile load failed:", err);
        setMessage({ type: "error", text: "Failed to load profile." });
      })
      .finally(() => setLoading(false));
  }, [router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
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
      setMessage({ type: "success", text: "Profile updated." });
    } catch (err) {
      console.error("Profile update failed:", err);
      setMessage({ type: "error", text: "Update failed. Try again." });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-skeuo-surface bg-white px-4 py-3 text-base text-skeuo-text outline-none transition-colors focus:border-skeuo-red disabled:bg-skeuo-base disabled:text-skeuo-muted";

  return (
    <div className="min-h-screen bg-skeuo-base">
      <header className="sticky top-0 z-40 border-b border-skeuo-surface bg-white px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="rounded-lg p-2 text-skeuo-text transition-colors hover:bg-skeuo-surface"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-black text-skeuo-text sm:text-xl">Update Profile</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-6 sm:py-8">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-skeuo-surface bg-white p-4 shadow-sm sm:p-6"
        >
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-skeuo-red border-t-transparent" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-skeuo-text">Email</label>
                <input value={email} disabled className={inputClass} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-skeuo-text">Name</label>
                <input name="name" value={form.name} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-skeuo-text">Phone</label>
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-skeuo-text">Specialization</label>
                <input name="specialization" value={form.specialization} onChange={handleChange} className={inputClass} />
              </div>

              {message && (
                <p className={`text-sm font-semibold ${message.type === "success" ? "text-skeuo-green" : "text-skeuo-red"}`}>
                  {message.text}
                </p>
              )}

              <button
                type="submit"
                disabled={saving || !doctorId}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-skeuo-red px-6 text-base font-bold text-white transition-all hover:bg-skeuo-red-dark disabled:opacity-50"
              >
                <Save size={18} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}