"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, User, Phone, Stethoscope, Mail, Loader2, CheckCircle,
  AlertCircle, MapPin, BadgeCheck, Briefcase, GraduationCap, X,
} from "lucide-react";
import { authService, doctorService } from "@/lib/apiService";

type Form = {
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender: string;
  pmdcNumber: string;
  experience: string;
  city: string;
};

const TITLES = ["Dr.", "Prof.", "Assoc. Prof.", "Asst. Prof."];
const GENDERS = ["Male", "Female", "Other"];

const inputBase =
  "w-full rounded-xl border-2 border-skeuo-surface bg-skeuo-base/30 py-3 pr-4 text-sm font-bold text-skeuo-text outline-none transition-colors focus:border-skeuo-red focus:bg-white";

function Field({
  label, icon, children,
}: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-skeuo-muted">
        {label}
      </label>
      <div className="group relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted group-focus-within:text-skeuo-red">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

function TagInput({
  label, icon, placeholder, values, onChange,
}: {
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [text, setText] = useState("");

  function add() {
    const v = text.trim();
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setText("");
  }

  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-skeuo-muted">
        {label}
      </label>
      <div className="group relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted group-focus-within:text-skeuo-red">
          {icon}
        </span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder={placeholder}
          className={`${inputBase} pl-11`}
        />
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1.5 rounded-lg bg-skeuo-red/10 px-2.5 py-1 text-xs font-bold text-skeuo-red"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const touched = useRef(false);

  const [doctorId, setDoctorId] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState("");
  const [form, setForm] = useState<Form>({
    title: "Dr.", firstName: "", lastName: "", phone: "", gender: "",
    pmdcNumber: "", experience: "0", city: "",
  });
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [qualifications, setQualifications] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("doctorToken")) {
      router.replace("/login");
      return;
    }

    const fill = (d: any) => {
      setDoctorId(d.id);
      setEmail(d.email ?? "");
      setPhoto(d.photo ?? "");
      setForm({
        title: d.title ?? "Dr.",
        firstName: d.firstName ?? "",
        lastName: d.lastName ?? "",
        phone: d.phone ?? "",
        gender: d.gender ?? "",
        pmdcNumber: d.pmdcNumber ?? "",
        experience: String(d.experience ?? 0),
        city: d.city ?? "",
      });
      setSpecializations(Array.isArray(d.specializations) ? d.specializations : []);
      setQualifications(Array.isArray(d.qualifications) ? d.qualifications : []);
    };

    // instant prefill from the doctor saved at login
    const cached = localStorage.getItem("doctor");
    if (cached) {
      try {
        fill(JSON.parse(cached));
        setLoading(false);
      } catch {}
    }

    // then refresh from the server
    authService
      .me()
      .then((doctor) => {
        localStorage.setItem("doctor", JSON.stringify(doctor));
        if (!touched.current) fill(doctor);
      })
      .catch((err) => {
        console.error("Profile load failed:", err);
        setMessage({ type: "error", text: "Failed to load profile." });
      })
      .finally(() => setLoading(false));
  }, [router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    touched.current = true;
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setMessage({ type: "error", text: "First and last name are required." });
      return;
    }
    const exp = Number(form.experience);
    if (!Number.isInteger(exp) || exp < 0 || exp > 80) {
      setMessage({ type: "error", text: "Experience must be a whole number between 0 and 80." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await doctorService.updateProfile(doctorId, {
        title: form.title,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || null,
        gender: form.gender || null,
        pmdcNumber: form.pmdcNumber.trim() || null,
        experience: exp,
        city: form.city.trim() || null,
        specializations,
        qualifications,
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

  const initials = `${form.firstName[0] ?? ""}${form.lastName[0] ?? ""}`.toUpperCase() || "DR";

  return (
    <div className="min-h-screen bg-skeuo-base">
      <header className="sticky top-0 z-40 border-b border-skeuo-surface/60 bg-white px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-4">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="grid h-10 w-10 place-items-center rounded-xl bg-skeuo-surface/50 text-skeuo-text active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black leading-none tracking-tight text-skeuo-text">Update Profile</h1>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-skeuo-muted">Doctor Settings</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="overflow-hidden rounded-[2rem] border border-skeuo-surface/60 bg-white shadow-sm">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-skeuo-muted">
              <Loader2 size={32} className="animate-spin text-skeuo-red" />
              <span className="text-sm font-bold uppercase tracking-widest">Loading Details...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 py-6 sm:px-8 sm:py-8">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="Profile" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-skeuo-red/10 text-xl font-black text-skeuo-red">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-skeuo-text">
                    {form.title} {form.firstName} {form.lastName}
                  </p>
                  <p className="truncate text-sm font-medium text-skeuo-muted">{email}</p>
                </div>
              </div>

              <Field label="Email Address (Read-only)" icon={<Mail size={18} />}>
                <input value={email} disabled className={`${inputBase} cursor-not-allowed pl-11 opacity-60`} />
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-[130px_1fr_1fr]">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-skeuo-muted">
                    Title
                  </label>
                  <select name="title" value={form.title} onChange={handleChange} className={`${inputBase} pl-4`}>
                    {TITLES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <Field label="First Name" icon={<User size={18} />}>
                  <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="John" className={`${inputBase} pl-11`} />
                </Field>
                <Field label="Last Name" icon={<User size={18} />}>
                  <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Doe" className={`${inputBase} pl-11`} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Phone Number" icon={<Phone size={18} />}>
                  <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+92 300 1234567" className={`${inputBase} pl-11`} />
                </Field>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-skeuo-muted">
                    Gender
                  </label>
                  <select name="gender" value={form.gender} onChange={handleChange} className={`${inputBase} pl-4`}>
                    <option value="">Select</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="PMDC Number" icon={<BadgeCheck size={18} />}>
                  <input name="pmdcNumber" value={form.pmdcNumber} onChange={handleChange} placeholder="12345-P" className={`${inputBase} pl-11`} />
                </Field>
                <Field label="Experience (Years)" icon={<Briefcase size={18} />}>
                  <input name="experience" type="number" min={0} max={80} inputMode="numeric" value={form.experience} onChange={handleChange} className={`${inputBase} pl-11`} />
                </Field>
              </div>

              <Field label="City" icon={<MapPin size={18} />}>
                <input name="city" value={form.city} onChange={handleChange} placeholder="Karachi" className={`${inputBase} pl-11`} />
              </Field>

              <TagInput
                label="Specializations"
                icon={<Stethoscope size={18} />}
                placeholder="Type and press Enter (e.g. Cardiologist)"
                values={specializations}
                onChange={(v) => { touched.current = true; setSpecializations(v); }}
              />

              <TagInput
                label="Qualifications"
                icon={<GraduationCap size={18} />}
                placeholder="Type and press Enter (e.g. MBBS, FCPS)"
                values={qualifications}
                onChange={(v) => { touched.current = true; setQualifications(v); }}
              />

              {message && (
                <div
                  className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 ${
                    message.type === "success"
                      ? "border-skeuo-green/30 bg-skeuo-green/5 text-skeuo-green"
                      : "border-rose-200 bg-rose-50 text-rose-600"
                  }`}
                >
                  {message.type === "success" ? <CheckCircle size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
                  <p className="text-sm font-bold">{message.text}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !doctorId}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-skeuo-red py-4 text-sm font-black text-white shadow-md transition-colors hover:bg-skeuo-red-dark active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
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