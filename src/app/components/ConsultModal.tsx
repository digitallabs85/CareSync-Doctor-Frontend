'use client';
import { useState } from "react";
import { X, User, Pill } from "lucide-react";
import { PrescriptionModal } from "./PrescriptionModal";
import { PatientInfoModal } from "./PatientInfoModal";

interface ConsultModalProps {
  onClose: () => void;
  patientId?: string;
  patientToken?: string;
  vitalsId: string;
}

export function ConsultModal({ onClose, patientId, patientToken, vitalsId }: ConsultModalProps) {
  const [tab, setTab] = useState<"info" | "prescription">("info");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Replaced max-h-[90vh] with h-full and widened max-w-lg to max-w-5xl for a proper full-screen feel */}
      <div className="relative z-10 h-full w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl animate-fade-in">

        {/* ================= Header Tabs ================= */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-skeuo-surface bg-white/90 px-4 py-3 backdrop-blur-md sm:px-5 sm:py-4 rounded-t-[2rem]">
          <div className="flex gap-2">
            <button
              onClick={() => setTab("info")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${tab === "info"
                ? "bg-skeuo-red text-white shadow-md shadow-skeuo-red/20"
                : "bg-skeuo-base/50 text-skeuo-muted hover:bg-skeuo-surface hover:text-skeuo-text"
                }`}
            >
              <User size={16} /> Info
            </button>
            <button
              onClick={() => setTab("prescription")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${tab === "prescription"
                ? "bg-skeuo-red text-white shadow-md shadow-skeuo-red/20"
                : "bg-skeuo-base/50 text-skeuo-muted hover:bg-skeuo-surface hover:text-skeuo-text"
                }`}
            >
              <Pill size={16} /> Prescription
            </button>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-skeuo-muted transition-colors hover:bg-skeuo-surface hover:text-skeuo-text"
          >
            <X size={20} />
          </button>
        </div>

        {/* ================= Embedded Content ================= */}
        {tab === "info" ? (
          <PatientInfoModal vitalsId={vitalsId} onClose={onClose} embedded />
        ) : (
          <PrescriptionModal
            patientId={patientId}
            patientToken={patientToken}
            vitalsId={vitalsId}
            onClose={onClose}
            embedded
          />
        )}
      </div>
    </div>
  );
}