"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { prescriptionService, vitalsService } from "@/lib/apiService";

export default function ConsultPage() {
    const { vitalsId } = useParams<{ vitalsId: string }>();
    const searchParams = useSearchParams();
    const type = searchParams.get("type"); // "walkin" or "online"
    const router = useRouter();

    const [vitals, setVitals] = useState<any>(null);
    const [prescription, setPrescription] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        vitalsService.getFullReport(vitalsId).then(setVitals);
    }, [vitalsId]);

    async function handleSave() {
        setSaving(true);
        try {
            await prescriptionService.save({
                vitalsId,
                content: prescription,
                consultType: type ?? "walkin",
            });
            router.push("/dashboard");
        } catch (err) {
            console.error("Prescription save failed:", err);
        } finally {
            setSaving(false);
        }
    }

    if (!vitals) return <p className="p-4">Loading...</p>;

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-lg font-semibold">
                {vitals.patientName} — {type === "walkin" ? "Walk-in" : "Online"} Consult
            </h1>
            {/* vitals display here */}
            <textarea
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
                className="w-full border rounded p-2 h-40"
                placeholder="Write prescription..."
            />
            <button
                onClick={handleSave}
                disabled={saving}
                className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
                {saving ? "Saving..." : "Save Prescription"}
            </button>
        </div>
    );
}