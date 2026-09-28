//app/dashboard/video-call/[vitalsid]/PatientInfoModal.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { X, User, Activity } from 'lucide-react';
import { vitalsService } from "@/lib/apiService";
import { formatHeight, formatTemperature } from './unitConversations';

interface PatientInfoModalProps {
  onClose: () => void;
  vitalsId: string;
  embedded?: boolean;
}

export const PatientInfoModal = ({ onClose, vitalsId, embedded = false }: PatientInfoModalProps) => {
  const [activeTab, setActiveTab] = useState<'demographics' | 'vitals'>('demographics');
  const [reportData, setReportData] = useState<any | null>(null);
  const [reportLoading, setReportLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setReportLoading(true);
    vitalsService.getFullReport(vitalsId)
      .then(res => { if (mounted) setReportData(res.data); })
      .catch(err => console.error('Failed to load full report:', err))
      .finally(() => { if (mounted) setReportLoading(false); });
    return () => { mounted = false; };
  }, [vitalsId]);

  const patient = reportData?.patient;
  const vitalsFromReport = reportData?.vitals;

  const tempUnit = vitalsFromReport?.temperatureUnit ?? 'C';
  const heightUnit = vitalsFromReport?.heightUnit ?? 'cm';
  const rawTemp = vitalsFromReport?.temperature;
  const rawHeight = vitalsFromReport?.height;

  const formattedTemp = rawTemp ? formatTemperature(rawTemp, tempUnit) : null;
  const formattedHeight = rawHeight ? formatHeight(rawHeight, heightUnit) : null;

  const content = (
    <>
      {!embedded && (
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-skeuo-surface bg-white/90 backdrop-blur-md px-4 py-4 sm:px-6 sm:py-5 rounded-t-[2rem]">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-skeuo-text">
              Patient Information
            </h2>
            {patient?.token && (
              <p className="mt-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-skeuo-muted">
                Token #{patient.token}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-skeuo-muted transition-colors hover:bg-skeuo-surface hover:text-skeuo-text"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* ================= Tabs ================= */}
      <div className="flex border-b border-skeuo-surface px-2 sm:px-4">
        {([
          { key: 'demographics', label: 'Demographics', icon: User },
          { key: 'vitals', label: 'Vitals', icon: Activity },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === key
                ? 'border-skeuo-red text-skeuo-red'
                : 'border-transparent text-skeuo-muted hover:text-skeuo-text'
              }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ================= Content ================= */}
      <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-6">
        {reportLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <span className="h-7 w-7 sm:h-8 sm:w-8 animate-spin rounded-full border-2 border-skeuo-red border-t-transparent" />
            <span className="text-sm font-bold text-skeuo-muted">Loading data...</span>
          </div>
        ) : !patient ? (
          <p className="py-8 text-center text-sm font-bold text-skeuo-muted">
            No patient data available.
          </p>
        ) : activeTab === 'demographics' ? (
          <div className="space-y-1">
            {[
              { label: 'Full Name', value: `${patient.firstName ?? '—'} ${patient.lastName ?? ''}`.trim() },
              { label: 'Age', value: patient.age ? `${patient.age} years` : '—' },
              { label: 'Gender', value: patient.gender ?? '—' },
              { label: 'Phone', value: patient.phoneNumber ?? '—' },
              { label: 'City', value: patient.city ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-4 border-b border-skeuo-surface/50 py-3 last:border-0">
                <span className="w-24 sm:w-32 shrink-0 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-skeuo-muted">
                  {label}
                </span>
                <span className="text-right text-sm sm:text-base font-bold text-skeuo-text">
                  {value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {[
              { label: 'Temperature', value: formattedTemp?.value, unit: formattedTemp?.unit },
              { label: 'Blood Pressure', value: vitalsFromReport?.systolic && vitalsFromReport?.diastolic ? `${vitalsFromReport.systolic}/${vitalsFromReport.diastolic}` : null, unit: 'mmHg' },
              { label: 'Pulse', value: vitalsFromReport?.pulseRate, unit: 'bpm' },
              { label: 'Weight', value: vitalsFromReport?.weight, unit: 'kg' },
              { label: 'Height', value: formattedHeight?.value, unit: formattedHeight?.unit },
              { label: 'SpO2', value: vitalsFromReport?.bloodOxygen, unit: '%' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="flex items-center justify-between border-b border-skeuo-surface/50 py-3 last:border-0">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-skeuo-muted">
                  {label}
                </span>
                <span className={`text-sm sm:text-base font-black ${value ? 'text-skeuo-text' : 'text-skeuo-surface'}`}>
                  {value ? `${value} ${unit}` : '—'}
                </span>
              </div>
            ))}
            <p className="mt-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-widest text-skeuo-muted/70">
              Last recorded vitals before consultation
            </p>
          </div>
        )}
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-[2rem] bg-white shadow-2xl animate-fade-in overflow-hidden">
        {content}
      </div>
    </div>
  );
};