'use client'
import React, { useState, useEffect } from 'react';
import { Pill, Search, Trash2, Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { prescriptionService } from '@/lib/apiService';
import { DIAGNOSIS_OPTIONS, DOSAGE_UNIT_OPTIONS, DURATION_UNIT_OPTIONS, HEMATOLOGICAL_OPTIONS, MEDICINE_OPTIONS, RADIOLOGICAL_OPTIONS } from './doctorConstants';

interface Medicine {
  id: number;
  name: string;
  dosage?: string;
  duration?: string;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  meal: string;
  [key: string]: any;
}

interface PrescriptionModalProps {
  onClose: () => void;
  patientId?: string;
  patientToken?: string;
  vitalsId?: string;
  embedded?: boolean;
}

export function PrescriptionModal({ onClose, patientId, patientToken, vitalsId, embedded = false }: PrescriptionModalProps) {
  const [medicines, setMedicines] = useState<Medicine[]>([
    { id: Date.now(), name: '', morning: false, afternoon: false, night: false, meal: 'After Meal' }
  ]);
  const [notes, setNotes] = useState('');
  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  const [diagnosisOther, setDiagnosisOther] = useState('');
  const [manualIds, setManualIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hematologicalTests, setHematologicalTests] = useState<string[]>([]);
  const [radiologicalTests, setRadiologicalTests] = useState<string[]>([]);
  const [hematologicalOther, setHematologicalOther] = useState('');
  const [radiologicalOther, setRadiologicalOther] = useState('');
  const [loadingPrescription, setLoadingPrescription] = useState(false);

  const splitDosage = (val: string) => {
    const match = val?.match(/^(\d*\.?\d*)\s*(.*)$/);
    return { num: match?.[1] ?? '', unit: match?.[2] || 'Tab' };
  };
  const splitDuration = (val: string) => {
    const match = val?.match(/^(\d*)\s*(.*)$/);
    return { num: match?.[1] ?? '', unit: match?.[2] || 'Day(s)' };
  };

  const updateMedicine = (id: number, field: string, value: any) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const toggleManual = (id: number) => {
    setManualIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleOtherInput = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (!value.trim()) return;
    setter(prev => [...prev.filter(i => !i.startsWith('Other:') && i !== 'Other'), `Other:${value.trim()}`]);
  };

  useEffect(() => {
    if (!vitalsId) {
      setMedicines([{ id: Date.now(), name: '', morning: false, afternoon: false, night: false, meal: 'After Meal' }]);
      setNotes('');
      setDiagnoses([]);
      setHematologicalTests([]);
      setRadiologicalTests([]);
      setLoadingPrescription(false);
      return;
    }

    const fetchPrescription = async () => {
      setLoadingPrescription(true);
      try {
        const data = await prescriptionService.getByVitalsId(vitalsId);

        setDiagnoses(data.diagnosis ? data.diagnosis.split(',').map((d: string) => d.trim()).filter(Boolean) : []);
        setHematologicalTests(data.hematologicalTest ? data.hematologicalTest.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
        setRadiologicalTests(data.radiologicalTest ? data.radiologicalTest.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
        setNotes(data.clinicalNotes || '');

        if (data.medicines && data.medicines.length > 0) {
          setMedicines(data.medicines.map((m: any) => ({
            id: Date.now() + Math.random(),
            name: m.medicineName,
            dosage: m.dosage || '',
            duration: m.duration || '',
            morning: m.morning || false,
            afternoon: m.afternoon || false,
            night: m.night || false,
            meal: m.beforeMeal ? 'Before Meal' : 'After Meal',
          })));
        } else {
          setMedicines([{ id: Date.now(), name: '', morning: false, afternoon: false, night: false, meal: 'After Meal' }]);
        }
      } catch (err: any) {
        // 404 = no prescription yet, expected/normal
        setMedicines([{ id: Date.now(), name: '', morning: false, afternoon: false, night: false, meal: 'After Meal' }]);
        setNotes('');
        setDiagnoses([]);
        setHematologicalTests([]);
        setRadiologicalTests([]);
        if (err.status !== 404) {
          console.error('Failed to fetch prescription:', err);
        }
      } finally {
        setLoadingPrescription(false);
      }
    };

    fetchPrescription();
  }, [vitalsId]);

  const handleSave = async () => {
    if (!patientId) {
      alert("No patient ID available to save prescription.");
      return;
    }
    setSaving(true);
    try {
      await prescriptionService.save({
        patientId,
        vitalsId,
        diagnosis: diagnoses.length > 0 ? diagnoses.join(', ') : undefined,
        hematologicalTest: hematologicalTests.length > 0 ? hematologicalTests.join(', ') : undefined,
        radiologicalTest: radiologicalTests.length > 0 ? radiologicalTests.join(', ') : undefined,
        clinicalNotes: notes,
        medicines: medicines
          .filter(m => m.name && m.name.trim() !== '')
          .map(m => ({
            medicineName: m.name,
            dosage: m.dosage,
            duration: m.duration,
            morning: m.morning,
            afternoon: m.afternoon,
            night: m.night,
            beforeMeal: m.meal === 'Before Meal',
            afterMeal: m.meal !== 'Before Meal',
          })),
      });
      setSaved(true);
      setTimeout(onClose, 1200);
    } catch (err: any) {
      alert(`Failed to save prescription: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <>
      {loadingPrescription ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-skeuo-red" />
          <span className="text-base font-bold text-skeuo-muted">Loading prescription...</span>
        </div>
      ) : (
        <>
          {!embedded && (
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-skeuo-surface bg-white/90 px-4 py-3 backdrop-blur-md sm:px-5 sm:py-4 rounded-t-[2rem]">
              <h2 className="flex items-center gap-2 text-lg font-black text-skeuo-text">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-skeuo-red/10 text-skeuo-red">
                  <Pill size={18} />
                </div>
                Prescription Builder
              </h2>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-skeuo-muted transition-colors hover:bg-skeuo-surface hover:text-skeuo-text"
              >
                <X size={20} />
              </button>
            </div>
          )}

          <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
            {/* ================= Medicines ================= */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-skeuo-muted">
                Medicines
              </p>
              <div className="space-y-3">
                {medicines.map((med) => (
                  <div key={med.id} className="group relative rounded-2xl border border-skeuo-surface bg-white p-3.5 transition-all hover:border-skeuo-red/30 hover:shadow-md">

                    {/* Delete Button */}
                    <button
                      onClick={() => setMedicines(medicines.filter(m => m.id !== med.id))}
                      className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-skeuo-surface bg-white text-rose-400 shadow-sm transition-all hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>

                    {/* Medicine Name */}
                    <div className="mb-3">
                      {manualIds.includes(med.id) ? (
                        <div className="flex gap-2">
                          <input
                            autoFocus
                            placeholder="Type medicine name..."
                            className="w-full rounded-xl border-2 border-skeuo-red bg-white px-3 py-2 text-base font-bold text-skeuo-text outline-none shadow-sm focus:ring-4 focus:ring-skeuo-red/10"
                            value={med.name}
                            onChange={(e) => updateMedicine(med.id, 'name', e.target.value)}
                          />
                          <button
                            onMouseDown={() => toggleManual(med.id)}
                            className="rounded-xl border border-skeuo-surface bg-white px-3 text-sm font-black text-skeuo-muted transition-colors hover:bg-skeuo-surface hover:text-skeuo-text"
                          >✕</button>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="flex items-center gap-2 rounded-xl border-2 border-skeuo-surface bg-skeuo-base/30 px-3 py-2 transition-colors focus-within:border-skeuo-red focus-within:bg-white">
                            <Search size={16} className="shrink-0 text-skeuo-muted" />
                            <input
                              placeholder="Search medicine..."
                              className="w-full bg-transparent text-base font-bold text-skeuo-text outline-none placeholder:text-skeuo-muted/60"
                              value={openDropdownId === med.id ? searchQuery : med.name}
                              onChange={(e) => { setSearchQuery(e.target.value); if (med.name) updateMedicine(med.id, 'name', ''); }}
                              onFocus={() => { setSearchQuery(''); setOpenDropdownId(med.id); }}
                              onBlur={() => setTimeout(() => setOpenDropdownId(null), 150)}
                            />
                            {med.name && openDropdownId !== med.id && (
                              <button
                                onMouseDown={() => { updateMedicine(med.id, 'name', ''); setSearchQuery(''); }}
                                className="shrink-0 text-sm font-black text-skeuo-muted hover:text-skeuo-text"
                              >✕</button>
                            )}
                          </div>

                          {openDropdownId === med.id && (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-skeuo-surface bg-white shadow-xl">
                              <div
                                onMouseDown={() => { toggleManual(med.id); updateMedicine(med.id, 'name', ''); setSearchQuery(''); }}
                                className="cursor-pointer border-b border-skeuo-surface px-3 py-2.5 text-sm font-black text-skeuo-red transition-colors hover:bg-skeuo-red/5"
                              >
                                ✏️ Other (type manually)
                              </div>
                              {MEDICINE_OPTIONS.filter(m => m.toLowerCase().includes(searchQuery.toLowerCase())).length > 0
                                ? MEDICINE_OPTIONS.filter(m => m.toLowerCase().includes(searchQuery.toLowerCase())).map((option) => (
                                  <div
                                    key={option}
                                    onMouseDown={() => { updateMedicine(med.id, 'name', option); setSearchQuery(''); setOpenDropdownId(null); }}
                                    className="cursor-pointer px-3 py-2.5 text-sm font-bold text-skeuo-text transition-colors hover:bg-skeuo-red/5 hover:text-skeuo-red"
                                  >
                                    {option}
                                  </div>
                                ))
                                : <div className="px-3 py-3 text-xs font-bold uppercase text-skeuo-muted">No match — use "Other" above</div>
                              }
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Dosage + Duration */}
                    <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex gap-1.5">
                        <input
                          placeholder="Qty" type="number" min="0"
                          className="w-14 sm:w-16 rounded-lg border border-skeuo-surface bg-skeuo-base/30 px-2 py-2 text-center text-sm font-bold text-skeuo-text outline-none transition-colors focus:border-skeuo-red focus:bg-white"
                          value={splitDosage(med.dosage ?? '').num}
                          onChange={(e) => updateMedicine(med.id, 'dosage', `${e.target.value} ${splitDosage(med.dosage ?? '').unit}`.trim())}
                        />
                        <select
                          className="flex-1 rounded-lg border border-skeuo-surface bg-skeuo-base/30 px-2 py-2 text-sm font-semibold text-skeuo-text outline-none transition-colors focus:border-skeuo-red focus:bg-white"
                          value={splitDosage(med.dosage ?? '').unit}
                          onChange={(e) => updateMedicine(med.id, 'dosage', `${splitDosage(med.dosage ?? '').num} ${e.target.value}`.trim())}
                        >
                          {DOSAGE_UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          placeholder="Dur" type="number" min="0"
                          className="w-14 sm:w-16 rounded-lg border border-skeuo-surface bg-skeuo-base/30 px-2 py-2 text-center text-sm font-bold text-skeuo-text outline-none transition-colors focus:border-skeuo-red focus:bg-white"
                          value={splitDuration(med.duration ?? '').num}
                          onChange={(e) => updateMedicine(med.id, 'duration', `${e.target.value} ${splitDuration(med.duration ?? '').unit}`.trim())}
                        />
                        <select
                          className="flex-1 rounded-lg border border-skeuo-surface bg-skeuo-base/30 px-2 py-2 text-sm font-semibold text-skeuo-text outline-none transition-colors focus:border-skeuo-red focus:bg-white"
                          value={splitDuration(med.duration ?? '').unit}
                          onChange={(e) => updateMedicine(med.id, 'duration', `${splitDuration(med.duration ?? '').num} ${e.target.value}`.trim())}
                        >
                          {DURATION_UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Schedule + Meal */}
                    <div className="flex flex-wrap items-center gap-3 border-t border-skeuo-surface pt-3">
                      <select
                        className="rounded-lg border border-skeuo-surface bg-skeuo-base/30 px-3 py-1.5 text-sm font-bold text-skeuo-text outline-none transition-colors focus:border-skeuo-red focus:bg-white"
                        value={med.meal}
                        onChange={(e) => updateMedicine(med.id, 'meal', e.target.value)}
                      >
                        <option>After Meal</option>
                        <option>Before Meal</option>
                      </select>
                      <div className="h-4 w-px bg-skeuo-surface hidden sm:block"></div>
                      <div className="flex items-center gap-3">
                        {['morning', 'afternoon', 'night'].map((time) => (
                          <label key={time} className="flex cursor-pointer items-center gap-1.5">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-skeuo-surface text-skeuo-red focus:ring-skeuo-red"
                              checked={!!med[time]}
                              onChange={(e) => updateMedicine(med.id, time, e.target.checked)}
                            />
                            <span className="text-xs font-bold uppercase text-skeuo-muted">{time}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Medicine Button */}
              <button
                onClick={() => setMedicines([...medicines, { id: Date.now(), name: '', morning: false, afternoon: false, night: false, meal: 'After Meal' }])}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-skeuo-red/30 bg-skeuo-red/5 px-4 py-3 text-sm font-bold uppercase tracking-widest text-skeuo-red transition-all hover:bg-skeuo-red/10"
              >
                + Add Medicine
              </button>
            </div>

            {/* ================= Diagnosis ================= */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-skeuo-muted">
                Diagnosis
              </p>
              {diagnoses.filter(d => d !== 'Other').length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {diagnoses.filter(d => d !== 'Other').map((d, i) => (
                    <span key={i} className="flex items-center gap-1.5 bg-white rounded-lg border border-skeuo-red/20 bg-skeuo-red/10 px-2.5 py-1.5 text-sm font-bold text-skeuo-red">
                      {d.startsWith('Other:') ? d.slice(6) : d}
                      <button
                        onClick={() => {
                          const val = diagnoses.filter(d => d !== 'Other')[i];
                          setDiagnoses(diagnoses.filter((_, j) => diagnoses.filter(d => d !== 'Other')[i] !== diagnoses[j]));
                          if (val?.startsWith('Other:')) setDiagnosisOther('');
                        }}
                        className="hover:text-red-700"
                      >✕</button>
                    </span>
                  ))}
                </div>
              )}
              <Popover>
                <PopoverTrigger className="flex min-h-[3rem] w-full items-center justify-between rounded-xl border-2 border-skeuo-surface bg-skeuo-base/30 px-4 py-2 text-left transition-colors hover:bg-white focus:border-skeuo-red outline-none">
                  <span className="text-base font-medium text-skeuo-muted">Search diagnosis...</span>
                  <ChevronsUpDown className="h-5 w-5 shrink-0 text-skeuo-muted" />
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] bg-white sm:w-80 rounded-xl border-skeuo-surface p-0 shadow-lg" align="start">
                  <Command>
                    <CommandInput placeholder="Search diagnosis..." className="h-11 border-b-skeuo-surface text-base" />
                    <CommandList>
                      <CommandGroup className="max-h-56 overflow-y-auto">
                        {DIAGNOSIS_OPTIONS.map((option) => (
                          <CommandItem
                            key={option}
                            onSelect={() => setDiagnoses(prev => prev.includes(option) ? prev.filter(d => d !== option) : [...prev, option])}
                            className="flex items-center gap-2.5 text-sm font-medium py-2"
                          >
                            <div className={`flex h-4 w-4 items-center justify-center rounded border ${diagnoses.includes(option) ? "border-skeuo-red bg-skeuo-red text-white" : "border-skeuo-surface bg-white"}`}>
                              {diagnoses.includes(option) && <Check className="h-3 w-3" />}
                            </div>
                            <span>{option}</span>
                          </CommandItem>
                        ))}
                        <CommandItem
                          onSelect={() => {
                            const hasOther = diagnoses.includes('Other') || diagnoses.some(d => d.startsWith('Other:'));
                            if (hasOther) { setDiagnoses(prev => prev.filter(d => d !== 'Other' && !d.startsWith('Other:'))); setDiagnosisOther(''); }
                            else { setDiagnoses(prev => [...prev, 'Other']); setDiagnosisOther(''); }
                          }}
                          className="mt-1 flex items-center gap-2.5 border-t border-skeuo-surface pt-2 text-sm font-medium"
                        >
                          <div className={`flex h-4 w-4 items-center justify-center rounded border ${diagnoses.includes('Other') || diagnoses.some(d => d.startsWith('Other:')) ? "border-skeuo-red bg-skeuo-red text-white" : "border-skeuo-surface bg-white"}`}>
                            {(diagnoses.includes('Other') || diagnoses.some(d => d.startsWith('Other:'))) && <Check className="h-3 w-3" />}
                          </div>
                          <span className="font-bold text-skeuo-red">Other (Specify)</span>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {(diagnoses.includes('Other') || diagnoses.some(d => d.startsWith('Other:'))) && (
                <div className="mt-2 flex gap-2">
                  <input
                    autoFocus
                    placeholder="Specify other diagnosis..."
                    className="flex-1 rounded-xl border-2 border-skeuo-red bg-white px-4 py-2 text-base font-bold text-skeuo-text outline-none focus:ring-4 focus:ring-skeuo-red/10"
                    value={diagnosisOther}
                    onChange={(e) => { setDiagnosisOther(e.target.value); handleOtherInput(e.target.value, setDiagnoses); }}
                  />
                  <button
                    onClick={() => { setDiagnoses(prev => prev.filter(d => d !== 'Other' && !d.startsWith('Other:'))); setDiagnosisOther(''); }}
                    className="rounded-xl border border-skeuo-surface bg-white px-3 text-sm font-black text-skeuo-muted transition-colors hover:bg-skeuo-surface hover:text-skeuo-text"
                  >✕</button>
                </div>
              )}
            </div>

            {/* ================= Hematological Tests ================= */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-skeuo-muted">
                Hematological Tests
              </p>
              {hematologicalTests.filter(t => t !== 'Other').length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {hematologicalTests.filter(t => t !== 'Other').map((t, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded-lg border border-skeuo-red/20 bg-skeuo-red/10 px-2.5 py-1.5 text-sm font-bold text-skeuo-red">
                      {t.startsWith('Other:') ? t.slice(6) : t}
                      <button
                        onClick={() => {
                          const val = hematologicalTests.filter(t => t !== 'Other')[i];
                          setHematologicalTests(hematologicalTests.filter((_, j) => hematologicalTests.filter(t => t !== 'Other')[i] !== hematologicalTests[j]));
                          if (val?.startsWith('Other:')) setHematologicalOther('');
                        }}
                        className="hover:text-red-700"
                      >✕</button>
                    </span>
                  ))}
                </div>
              )}
              <Popover>
                <PopoverTrigger className="flex min-h-[3rem] w-full items-center justify-between rounded-xl border-2 border-skeuo-surface bg-skeuo-base/30 px-4 py-2 text-left transition-colors hover:bg-white focus:border-skeuo-red outline-none">
                  <span className="text-base font-medium text-skeuo-muted">Search hematological tests...</span>
                  <ChevronsUpDown className="h-5 w-5 shrink-0 text-skeuo-muted" />
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] bg-white sm:w-80 rounded-xl border-skeuo-surface p-0 shadow-lg" align="start">
                  <Command>
                    <CommandInput placeholder="Search test..." className="h-11 border-b-skeuo-surface text-base" />
                    <CommandList>
                      <CommandGroup className="max-h-56 overflow-y-auto">
                        {HEMATOLOGICAL_OPTIONS.map((option) => (
                          <CommandItem
                            key={option}
                            onSelect={() => setHematologicalTests(prev => prev.includes(option) ? prev.filter(t => t !== option) : [...prev, option])}
                            className="flex items-center gap-2.5 text-sm font-medium py-2"
                          >
                            <div className={`flex h-4 w-4 items-center justify-center rounded border ${hematologicalTests.includes(option) ? "border-skeuo-red bg-skeuo-red text-white" : "border-skeuo-surface bg-white"}`}>
                              {hematologicalTests.includes(option) && <Check className="h-3 w-3" />}
                            </div>
                            <span>{option}</span>
                          </CommandItem>
                        ))}
                        <CommandItem
                          onSelect={() => {
                            const hasOther = hematologicalTests.includes('Other') || hematologicalTests.some(t => t.startsWith('Other:'));
                            if (hasOther) { setHematologicalTests(prev => prev.filter(t => t !== 'Other' && !t.startsWith('Other:'))); setHematologicalOther(''); }
                            else { setHematologicalTests(prev => [...prev, 'Other']); setHematologicalOther(''); }
                          }}
                          className="mt-1 flex items-center gap-2.5 border-t border-skeuo-surface pt-2 text-sm font-medium"
                        >
                          <div className={`flex h-4 w-4 items-center justify-center rounded border ${hematologicalTests.includes('Other') || hematologicalTests.some(t => t.startsWith('Other:')) ? "border-skeuo-red bg-skeuo-red text-white" : "border-skeuo-surface bg-white"}`}>
                            {(hematologicalTests.includes('Other') || hematologicalTests.some(t => t.startsWith('Other:'))) && <Check className="h-3 w-3" />}
                          </div>
                          <span className="font-bold text-skeuo-red">Other (Specify)</span>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {(hematologicalTests.includes('Other') || hematologicalTests.some(t => t.startsWith('Other:'))) && (
                <div className="mt-2 flex gap-2">
                  <input
                    autoFocus
                    placeholder="Specify other test..."
                    className="flex-1 rounded-xl border-2 border-skeuo-red bg-white px-4 py-2 text-base font-bold text-skeuo-text outline-none focus:ring-4 focus:ring-skeuo-red/10"
                    value={hematologicalOther}
                    onChange={(e) => { setHematologicalOther(e.target.value); handleOtherInput(e.target.value, setHematologicalTests); }}
                  />
                  <button
                    onClick={() => { setHematologicalTests(prev => prev.filter(t => t !== 'Other' && !t.startsWith('Other:'))); setHematologicalOther(''); }}
                    className="rounded-xl border border-skeuo-surface bg-white px-3 text-sm font-black text-skeuo-muted transition-colors hover:bg-skeuo-surface hover:text-skeuo-text"
                  >✕</button>
                </div>
              )}
            </div>

            {/* ================= Radiological Tests ================= */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-skeuo-muted">
                Radiological Tests
              </p>
              {radiologicalTests.filter(t => t !== 'Other').length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {radiologicalTests.filter(t => t !== 'Other').map((t, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded-lg border border-skeuo-red/20 bg-skeuo-red/10 px-2.5 py-1.5 text-sm font-bold text-skeuo-red">
                      {t.startsWith('Other:') ? t.slice(6) : t}
                      <button
                        onClick={() => {
                          const val = radiologicalTests.filter(t => t !== 'Other')[i];
                          setRadiologicalTests(radiologicalTests.filter((_, j) => radiologicalTests.filter(t => t !== 'Other')[i] !== radiologicalTests[j]));
                          if (val?.startsWith('Other:')) setRadiologicalOther('');
                        }}
                        className="hover:text-red-700"
                      >✕</button>
                    </span>
                  ))}
                </div>
              )}
              <Popover>
                <PopoverTrigger className="flex min-h-[3rem] w-full items-center justify-between rounded-xl border-2 border-skeuo-surface bg-skeuo-base/30 px-4 py-2 text-left transition-colors hover:bg-white focus:border-skeuo-red outline-none">
                  <span className="text-base font-medium text-skeuo-muted">Search radiological tests...</span>
                  <ChevronsUpDown className="h-5 w-5 shrink-0 text-skeuo-muted" />
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] bg-white sm:w-80 rounded-xl border-skeuo-surface p-0 shadow-lg" align="start">
                  <Command>
                    <CommandInput placeholder="Search test..." className="h-11 border-b-skeuo-surface text-base" />
                    <CommandList>
                      <CommandGroup className="max-h-56 overflow-y-auto">
                        {RADIOLOGICAL_OPTIONS.map((option) => (
                          <CommandItem
                            key={option}
                            onSelect={() => setRadiologicalTests(prev => prev.includes(option) ? prev.filter(t => t !== option) : [...prev, option])}
                            className="flex items-center gap-2.5 text-sm font-medium py-2"
                          >
                            <div className={`flex h-4 w-4 items-center justify-center rounded border ${radiologicalTests.includes(option) ? "border-skeuo-red bg-skeuo-red text-white" : "border-skeuo-surface bg-white"}`}>
                              {radiologicalTests.includes(option) && <Check className="h-3 w-3" />}
                            </div>
                            <span>{option}</span>
                          </CommandItem>
                        ))}
                        <CommandItem
                          onSelect={() => {
                            const hasOther = radiologicalTests.includes('Other') || radiologicalTests.some(t => t.startsWith('Other:'));
                            if (hasOther) { setRadiologicalTests(prev => prev.filter(t => t !== 'Other' && !t.startsWith('Other:'))); setRadiologicalOther(''); }
                            else { setRadiologicalTests(prev => [...prev, 'Other']); setRadiologicalOther(''); }
                          }}
                          className="mt-1 flex items-center gap-2.5 border-t border-skeuo-surface pt-2 text-sm font-medium"
                        >
                          <div className={`flex h-4 w-4 items-center justify-center rounded border ${radiologicalTests.includes('Other') || radiologicalTests.some(t => t.startsWith('Other:')) ? "border-skeuo-red bg-skeuo-red text-white" : "border-skeuo-surface bg-white"}`}>
                            {(radiologicalTests.includes('Other') || radiologicalTests.some(t => t.startsWith('Other:'))) && <Check className="h-3 w-3" />}
                          </div>
                          <span className="font-bold text-skeuo-red">Other (Specify)</span>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {(radiologicalTests.includes('Other') || radiologicalTests.some(t => t.startsWith('Other:'))) && (
                <div className="mt-2 flex gap-2">
                  <input
                    autoFocus
                    placeholder="Specify other test..."
                    className="flex-1 rounded-xl border-2 border-skeuo-red bg-white px-4 py-2 text-base font-bold text-skeuo-text outline-none focus:ring-4 focus:ring-skeuo-red/10"
                    value={radiologicalOther}
                    onChange={(e) => { setRadiologicalOther(e.target.value); handleOtherInput(e.target.value, setRadiologicalTests); }}
                  />
                  <button
                    onClick={() => { setRadiologicalTests(prev => prev.filter(t => t !== 'Other' && !t.startsWith('Other:'))); setRadiologicalOther(''); }}
                    className="rounded-xl border border-skeuo-surface bg-white px-3 text-sm font-black text-skeuo-muted transition-colors hover:bg-skeuo-surface hover:text-skeuo-text"
                  >✕</button>
                </div>
              )}
            </div>

            {/* ================= Clinical Notes ================= */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-skeuo-muted">
                Clinical Notes
              </p>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Clinical remarks, lifestyle advice..."
                className="w-full rounded-2xl border-2 border-skeuo-surface bg-skeuo-base/30 px-4 py-3 text-base font-medium text-skeuo-text outline-none transition-all focus:border-skeuo-red focus:bg-white placeholder:text-skeuo-muted/60"
              />
            </div>

            {/* ================= Action Buttons ================= */}
            <div className="flex gap-3 pt-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl bg-skeuo-surface/50 py-3.5 text-sm font-bold uppercase tracking-widest text-skeuo-muted transition-all hover:bg-skeuo-surface hover:text-skeuo-text"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-md transition-all 
              ${saved
                    ? 'bg-skeuo-green shadow-skeuo-green/20'
                    : saving
                      ? 'cursor-not-allowed bg-skeuo-surface text-skeuo-muted shadow-none'
                      : 'bg-skeuo-red hover:bg-skeuo-red-dark hover:shadow-lg hover:shadow-skeuo-red/20 active:scale-[0.98]'
                  }`}
              >
                {saved ? (
                  <><Check size={16} /> Saved!</>
                ) : saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><Pill size={16} /> Save </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] bg-white shadow-2xl animate-fade-in">
        {content}
      </div>
    </div>
  );
}