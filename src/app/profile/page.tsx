"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, User, Phone, Stethoscope, Mail, Loader2, CheckCircle,
  AlertCircle, MapPin, BadgeCheck, Briefcase, GraduationCap, X,
  Camera,
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
    <div className="flex min-h-screen flex-col bg-skeuo-base">
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
          onDone={(file) => { closeCrop(); uploadPhotoFile(file); }}
        />
      )}

      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {showPhotoChoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowPhotoChoice(false)}
        >
          <div className="flex w-64 flex-col gap-3 rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-center text-sm font-semibold text-skeuo-text">Profile Photo</h3>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="w-full rounded-lg bg-skeuo-red py-2 text-sm font-medium text-white hover:bg-skeuo-red-dark"
                onClick={() => { setShowPhotoChoice(false); setShowWebcam(true); }}
              >
                Take Photo
              </button>
              <button
                type="button"
                className="w-full rounded-lg bg-skeuo-surface py-2 text-sm font-medium text-skeuo-text"
                onClick={() => { setShowPhotoChoice(false); fileInputRef.current?.click(); }}
              >
                Upload from Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-skeuo-surface/60 bg-white px-2 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-4">
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

      <main className="mx-auto flex w-full max-w-2xl flex-col px-2 py-4 sm:px-6 sm:py-10">
        <div className="overflow-hidden rounded-xl border border-skeuo-surface/60 bg-white shadow-sm">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-skeuo-muted">
              <Loader2 size={32} className="animate-spin text-skeuo-red" />
              <span className="text-sm font-bold uppercase tracking-widest">Loading Details...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 px-5 py-4 sm:px-8 sm:py-8">
              {/* Avatar */}
              <div className="flex w-full items-center gap-4">
                <button type="button" onClick={() => setShowPhotoChoice(true)} aria-label="Change photo" className="relative shrink-0 active:scale-95">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="Profile" className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-skeuo-red/10 text-xl font-black text-skeuo-red">{initials}</div>
                  )}
                  {photoUploading && (
                    <span className="absolute inset-0 grid place-items-center rounded-full bg-white/70">
                      <Loader2 size={20} className="animate-spin text-skeuo-red" />
                    </span>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-skeuo-red text-white">
                    <Camera size={12} />
                  </span>
                </button>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-lg font-black text-skeuo-text">{form.title} {form.firstName} {form.lastName}</p>
                  <p className="truncate text-sm font-medium text-skeuo-muted">{email}</p>
                </div>
              </div>

              {/* Title */}
              <div className="flex w-full min-w-0 flex-col gapTextAndInput sm:w-32.5">
                <label className="form-label">Title</label>
                <Select
                  value={form.title}
                  onValueChange={(v) => { touched.current = true; setForm((p) => ({ ...p, title: v ?? p.title })); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-skeuo-surface bg-white">
                    {TITLES.map((t) => (
                      <SelectItem key={t} value={t} className="cursor-pointer text-sm font-semibold text-skeuo-text focus:text-skeuo-red">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email */}
              <div className="flex w-full min-w-0 flex-col gapTextAndInput">
                <label className="form-label">Email Address (Read-only)</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted"><Mail size={18} className="text-skeuo-red"/></span>
                  <input value={email} disabled className="form-input pl-11 cursor-not-allowed opacity-60" />
                </div>
              </div>

              {/* First name */}
              <div className="flex w-full min-w-0 flex-col gapTextAndInput sm:w-[calc((100%-162px)/2)]">
                <label className="form-label">First Name</label>
                <div className="group relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted group-focus-within:text-skeuo-red"><User size={18} className="text-skeuo-red" /></span>
                  <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="John" className="form-input pl-11" />
                </div>
              </div>

              {/* Last name */}
              <div className="flex w-full min-w-0 flex-col gapTextAndInput sm:w-[calc((100%-162px)/2)]">
                <label className="form-label">Last Name</label>
                <div className="group relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted group-focus-within:text-skeuo-red"><User size={18} className="text-skeuo-red" /></span>
                  <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Doe" className="form-input pl-11" />
                </div>
              </div>

              {/* Phone */}
              <div className="flex w-full min-w-0 flex-col gapTextAndInput sm:w-[calc(50%-8px)]">
                <label className="form-label">Phone Number</label>
                <div className="group relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted group-focus-within:text-skeuo-red"><Phone size={18} className="text-skeuo-red" /></span>
                  <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+92 300 1234567" className="form-input pl-11" />
                </div>
              </div>

              {/* Gender */}
              <div className="flex w-full min-w-0 flex-col gapTextAndInput sm:w-[calc(50%-8px)]">
                <label className="form-label">Gender</label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => { touched.current = true; setForm((p) => ({ ...p, gender: v ?? "" })); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-2 border-skeuo-surface bg-white">
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g} className="cursor-pointer text-sm font-semibold text-skeuo-text focus:text-skeuo-red">
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* PMDC */}
              <div className="flex w-full min-w-0 flex-col gapTextAndInput sm:w-[calc(50%-8px)]">
                <label className="form-label">PMDC Number</label>
                <div className="group relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted group-focus-within:text-skeuo-red"><BadgeCheck size={18} className="text-skeuo-red" /></span>
                  <input name="pmdcNumber" value={form.pmdcNumber} onChange={handleChange} placeholder="12345-P" className="form-input pl-11" />
                </div>
              </div>

              {/* Experience */}
              <div className="flex w-full min-w-0 flex-col gapTextAndInput sm:w-[calc(50%-8px)]">
                <label className="form-label">Experience (Years)</label>
                <div className="group relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted group-focus-within:text-skeuo-red"><Briefcase size={18} className="text-skeuo-red" /></span>
                  <input name="experience" type="number" min={0} max={80} inputMode="numeric" value={form.experience} onChange={handleChange} className="form-input pl-11" />
                </div>
              </div>

              {/* City */}
              <div className="flex w-full min-w-0 flex-col gapTextAndInput">
                <label className="form-label">City</label>
                <div className="group relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted group-focus-within:text-skeuo-red"><MapPin size={18} className="text-skeuo-red" /></span>
                  <input name="city" value={form.city} onChange={handleChange} placeholder="Karachi" className="form-input pl-11" />
                </div>
              </div>

              {/* Specializations */}
              <div className="flex w-full min-w-0 flex-col gapTextAndInput">
                <label className="form-label">Specializations</label>
                <div className="group relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted group-focus-within:text-skeuo-red"><Stethoscope size={18} className="text-skeuo-red" /></span>
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
                    className="form-input pl-11"
                  />
                </div>
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
              </div>

              {/* Qualifications */}
              <div className="flex w-full min-w-0 flex-col gapTextAndInput">
                <label className="form-label">Qualifications</label>
                <div className="group relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted group-focus-within:text-skeuo-red"><GraduationCap size={18} className="text-skeuo-red" /></span>
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
                    className="form-input pl-11"
                  />
                </div>
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
              </div>

              {/* Message */}
              {message && (
                <div className={`flex w-full items-center gap-2.5 rounded-xl border px-4 py-3 ${message.type === "success" ? "border-skeuo-green/30 bg-skeuo-green/5 text-skeuo-green" : "border-rose-200 bg-rose-50 text-rose-600"}`}>
                  {message.type === "success" ? <CheckCircle size={18}className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
                  <p className="text-sm font-bold">{message.text}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={saving || !doctorId}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-skeuo-red py-4 text-sm font-black text-white shadow-md transition-colors hover:bg-skeuo-red-dark active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
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