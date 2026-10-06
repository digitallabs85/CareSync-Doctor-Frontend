"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, User, Phone, Stethoscope, Mail, Loader2, CheckCircle,
  AlertCircle, MapPin, BadgeCheck, Briefcase, GraduationCap, X,
  Camera,
  Users,
  Tag,
} from "lucide-react";
import { authService, doctorService, uploadService } from "@/lib/apiService";
import { WebcamPhotoModal } from "../components/WebcamPhotoModal";
import { ImageCropModal } from "../components/ImageCropModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

import type { LucideIcon } from "lucide-react";

function Field({
  label, icon: Icon, className = "", children,
}: { label: string; icon: LucideIcon; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex w-full min-w-0 flex-col gapTextAndInput ${className}`}>
      <label className="form-label flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-skeuo-red text-white">
          <Icon size={18} />
        </span>
        {label}
      </label>
      {children}
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [showPhotoChoice, setShowPhotoChoice] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [specText, setSpecText] = useState("");
  const [qualText, setQualText] = useState("");

  function addTag(text: string, list: string[], setList: (v: string[]) => void, setText: (v: string) => void) {
    const v = text.trim();
    if (v && !list.some((x) => x.toLowerCase() === v.toLowerCase())) {
      touched.current = true;
      setList([...list, v]);
    }
    setText("");
  }

  function closeCrop() {
    if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  const uploadPhotoFile = useCallback(async (file: File) => {
    setPhotoUploading(true);
    setMessage(null);
    try {
      const data = await uploadService.uploadDoctorPhoto(file);
      touched.current = true;
      setPhoto(data.url);
      setMessage({ type: "success", text: "Photo uploaded. Tap Save Profile to apply." });
    } catch (err) {
      console.error("Photo upload failed:", err);
      setMessage({ type: "error", text: "Photo upload failed. Try again." });
    } finally {
      setPhotoUploading(false);
    }
  }, []);

  const handleWebcamCapture = useCallback((dataUrl: string) => {
    setCropSrc(dataUrl);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  }

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
      } catch { }
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
        photo: photo || null,
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
      <WebcamPhotoModal
        isOpen={showWebcam}
        onClose={() => setShowWebcam(false)}
        onCapture={handleWebcamCapture}
        title="Take Your Photo"
      />

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onCancel={closeCrop}
          onDone={(file) => {
            closeCrop();
            uploadPhotoFile(file);
          }}
        />
      )}

      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {showPhotoChoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowPhotoChoice(false)}
        >
          <div className="flex w-64 flex-col gap-3 rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-center text-sm font-bold text-skeuo-text">Profile Photo</h3>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="w-full rounded-lg bg-skeuo-red py-2 text-sm sm:text-base font-bold text-white hover:bg-skeuo-red-dark"
                onClick={() => { setShowPhotoChoice(false); setShowWebcam(true); }}
              >
                Take Photo
              </button>
              <button
                type="button"
                className="w-full rounded-lg bg-skeuo-surface py-2 text-sm sm:text-base font-bold text-skeuo-text"
                onClick={() => { setShowPhotoChoice(false); fileInputRef.current?.click(); }}
              >
                Upload from Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-skeuo-surface/60 bg-white px-2 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-4">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="grid h-10 w-10 place-items-center rounded-xl bg-skeuo-surface/50 text-skeuo-text active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-black leading-none tracking-tight text-skeuo-text">Update Profile</h1>
            <p className="text-[10px] font-bold uppercase leading-none tracking-widest text-skeuo-muted">Doctor Settings</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-col px-2 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-skeuo-surface bg-white shadow-sm">
          <div className="p-4 sm:p-6 lg:p-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 sm:py-12 text-base text-skeuo-muted">
                <span className="h-6 w-6 sm:h-7 sm:w-7 animate-spin rounded-full border-2 border-skeuo-red border-t-transparent" />
                Loading Details...
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-6">

                {/* Avatar Section */}
                <div className="flex items-center gap-3 sm:gap-4 ">
                  <button type="button" onClick={() => setShowPhotoChoice(true)} aria-label="Change photo" className="relative shrink-0 transition-transform active:scale-95">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="Profile" className="h-14 w-14 rounded-full object-cover sm:h-16 sm:w-16" />
                    ) : (
                      <div className="grid h-14 w-14 place-items-center rounded-full bg-skeuo-red/10 text-lg font-black text-skeuo-red sm:h-16 sm:w-16 sm:text-xl">{initials}</div>
                    )}
                    {photoUploading && (
                      <span className="absolute inset-0 grid place-items-center rounded-full bg-white/70">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-skeuo-red border-t-transparent" />
                      </span>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-skeuo-red text-white shadow-sm sm:h-6 sm:w-6">
                      <Camera size={12} />
                    </span>
                  </button>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate text-base font-bold text-skeuo-text sm:text-lg">{form.title} {form.firstName} {form.lastName}</p>
                    <p className="truncate text-sm font-medium text-skeuo-muted">{email}</p>
                  </div>
                </div>

                <div className="border-b border-skeuo-surface" />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Title" icon={Tag} className="sm:col-span-2 sm:max-w-[200px]">
                    <Select value={form.title} onValueChange={(v) => { touched.current = true; setForm((p) => ({ ...p, title: v ?? p.title })); }}>
                      <SelectTrigger className="form-input"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-lg border-skeuo-surface bg-white">
                        {TITLES.map((t) => (
                          <SelectItem key={t} value={t} className="cursor-pointer text-sm font-semibold text-skeuo-text focus:text-skeuo-red">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="First Name" icon={User}>
                    <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="John" className="form-input" />
                  </Field>

                  <Field label="Last Name" icon={User}>
                    <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Doe" className="form-input" />
                  </Field>

                  <Field label="Email Address (Read-only)" icon={Mail} className="sm:col-span-2">
                    <input value={email} disabled className="form-input cursor-not-allowed bg-skeuo-surface/20 opacity-60" />
                  </Field>

                  <Field label="Phone Number" icon={Phone}>
                    <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+92 300 1234567" className="form-input" />
                  </Field>

                  <Field label="Gender" icon={Users}>
                    <Select value={form.gender} onValueChange={(v) => { touched.current = true; setForm((p) => ({ ...p, gender: v ?? "" })); }}>
                      <SelectTrigger className="form-input"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="rounded-lg border-skeuo-surface bg-white">
                        {GENDERS.map((g) => (
                          <SelectItem key={g} value={g} className="cursor-pointer text-sm font-semibold text-skeuo-text focus:text-skeuo-red">{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="PMDC Number" icon={BadgeCheck}>
                    <input name="pmdcNumber" value={form.pmdcNumber} onChange={handleChange} placeholder="12345-P" className="form-input" />
                  </Field>

                  <Field label="Experience (Years)" icon={Briefcase}>
                    <input name="experience" type="number" min={0} max={80} inputMode="numeric" value={form.experience} onChange={handleChange} className="form-input" />
                  </Field>

                  <Field label="City" icon={MapPin} className="sm:col-span-2">
                    <input name="city" value={form.city} onChange={handleChange} placeholder="Karachi" className="form-input" />
                  </Field>

                  <Field label="Specializations" icon={Stethoscope} className="sm:col-span-2">
                    <input
                      value={specText}
                      onChange={(e) => setSpecText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addTag(specText, specializations, setSpecializations, setSpecText);
                        }
                      }}
                      onBlur={() => addTag(specText, specializations, setSpecializations, setSpecText)}
                      placeholder="Type and press Enter (e.g. Cardiologist)"
                      className="form-input"
                    />
                    {specializations.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {specializations.map((v) => (
                          <span key={v} className="flex items-center gap-1.5 rounded-lg bg-skeuo-red/10 px-2.5 py-1 text-xs font-bold text-skeuo-red">
                            {v}
                            <button type="button" aria-label={`Remove ${v}`} onClick={() => { touched.current = true; setSpecializations(specializations.filter((x) => x !== v)); }}>
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </Field>

                  <Field label="Qualifications" icon={GraduationCap} className="sm:col-span-2">
                    <input
                      value={qualText}
                      onChange={(e) => setQualText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addTag(qualText, qualifications, setQualifications, setQualText);
                        }
                      }}
                      onBlur={() => addTag(qualText, qualifications, setQualifications, setQualText)}
                      placeholder="Type and press Enter (e.g. MBBS, FCPS)"
                      className="form-input"
                    />
                    {qualifications.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {qualifications.map((v) => (
                          <span key={v} className="flex items-center gap-1.5 rounded-lg bg-skeuo-red/10 px-2.5 py-1 text-xs font-bold text-skeuo-red">
                            {v}
                            <button type="button" aria-label={`Remove ${v}`} onClick={() => { touched.current = true; setQualifications(qualifications.filter((x) => x !== v)); }}>
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </Field>
                </div>

                {/* Message */}
                {message && (
                  <div className={`mt-2 flex w-full items-center gap-2.5 rounded-xl border px-4 py-3 ${message.type === "success" ? "border-skeuo-green/30 bg-skeuo-green/5 text-skeuo-green" : "border-rose-200 bg-rose-50 text-rose-600"}`}>
                    {message.type === "success" ? <CheckCircle size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
                    <p className="text-sm font-bold">{message.text}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={saving || !doctorId}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-skeuo-red py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-skeuo-red-dark hover:shadow-lg active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:py-4 sm:text-base"
                >
                  {saving ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
        </div>
      </main>
    </div>
  );
}