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
        <div className="bg-[#0297d6] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Patient Information</h2>
            {patient?.token && (
              <p className="text-blue-100 text-xs mt-0.5">Token #{patient.token}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        {([
          { key: 'demographics', label: 'Demographics', icon: User },
          { key: 'vitals', label: 'Vitals', icon: Activity },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === key
              ? 'border-[#0297d6] text-[#0297d6]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 max-h-[60vh] overflow-y-auto">
        {reportLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="w-6 h-6 border-2 border-[#0297d6] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !patient ? (
          <p className="text-center text-slate-400 text-sm py-8">No patient data available.</p>
        ) : activeTab === 'demographics' ? (
          <div className="space-y-3">
            {[
              { label: 'Full Name', value: `${patient.firstName ?? '—'} ${patient.lastName ?? ''}`.trim() },
              { label: 'Age', value: patient.age ? `${patient.age} years` : '—' },
              { label: 'Gender', value: patient.gender ?? '—' },
              { label: 'Phone', value: patient.phoneNumber ?? '—' },
              { label: 'City', value: patient.city ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start gap-4 py-2.5 border-b border-slate-50 last:border-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider w-32 shrink-0">
                  {label}
                </span>
                <span className="text-sm text-slate-700 font-medium text-right">{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { label: 'Temperature', value: formattedTemp?.value, unit: formattedTemp?.unit },
              { label: 'Blood Pressure', value: vitalsFromReport?.systolic && vitalsFromReport?.diastolic ? `${vitalsFromReport.systolic}/${vitalsFromReport.diastolic}` : null, unit: 'mmHg' },
              { label: 'Pulse', value: vitalsFromReport?.pulseRate, unit: 'bpm' },
              { label: 'Weight', value: vitalsFromReport?.weight, unit: 'kg' },
              { label: 'Height', value: formattedHeight?.value, unit: formattedHeight?.unit },
              { label: 'SpO2', value: vitalsFromReport?.bloodOxygen, unit: '%' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="flex justify-between items-center py-2.5 border-b border-slate-50 last:border-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {label}
                </span>
                <span className={`text-sm font-bold ${value ? 'text-slate-800' : 'text-slate-300'}`}>
                  {value ? `${value} ${unit}` : '—'}
                </span>
              </div>
            ))}
            <p className="text-xs text-slate-400 text-center pt-2">
              Last recorded vitals before consultation
            </p>
          </div>
        )}
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        {content}
      </div>
    </div>
  );
};