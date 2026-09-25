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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 pt-6 pb-2 border-b border-slate-100 rounded-t-[2rem]">
          <div className="flex gap-2">
            <button
              onClick={() => setTab("info")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase ${tab === "info" ? "bg-[#0297d6] text-white" : "bg-slate-100 text-slate-500"}`}
            >
              <User size={14} /> Info
            </button>
            <button
              onClick={() => setTab("prescription")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase ${tab === "prescription" ? "bg-[#0297d6] text-white" : "bg-slate-100 text-slate-500"}`}
            >
              <Pill size={14} /> Prescription
            </button>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

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