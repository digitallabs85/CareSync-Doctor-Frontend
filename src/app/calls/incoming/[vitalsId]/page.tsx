"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Phone, PhoneOff } from "lucide-react";
import { notificationService } from "@/lib/apiService";
import { AndroidBridge } from "@/lib/AndroidBridge";

export default function IncomingCallPage() {
    const { vitalsId } = useParams<{ vitalsId: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();
    const patientName = searchParams.get("name") || "Patient";
    const [loading, setLoading] = useState(false);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        pollRef.current = setInterval(async () => {
            try {
                const call = await notificationService.getCallStatus(vitalsId);
                if (call.status !== "pending") {
                    if (pollRef.current) clearInterval(pollRef.current);
                    AndroidBridge.notifyCallEnded();
                    router.replace("/dashboard");
                }
            } catch { }
        }, 3000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [vitalsId, router]);

    async function handleAccept() {
        setLoading(true);
        try {
            if (pollRef.current) clearInterval(pollRef.current);
            AndroidBridge.notifyCallEnded();
            await notificationService.acceptCall(vitalsId);
            router.replace(`/calls/active/${vitalsId}`);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    }

    async function handleDecline() {
        setLoading(true);
        try {
            await notificationService.doctorDeclineCall(vitalsId);
        } catch (err) {
            console.error(err);
        } finally {
            AndroidBridge.notifyCallEnded();
            router.replace("/dashboard");

        }
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 to-slate-800 text-white py-16">
            <div className="flex flex-col items-center gap-4 mt-20">
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-700 text-4xl font-semibold">
                    {patientName.charAt(0).toUpperCase()}
                </div>
                <h1 className="text-2xl font-medium">{patientName}</h1>
                <p className="text-slate-400 animate-pulse">Incoming video consultation...</p>
            </div>

            <div className="flex w-full justify-center gap-16 pb-10">
                <button
                    onClick={handleDecline}
                    disabled={loading}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 disabled:opacity-50"
                >
                    <PhoneOff size={28} />
                </button>
                <button
                    onClick={handleAccept}
                    disabled={loading}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 disabled:opacity-50"
                >
                    <Phone size={28} />
                </button>
            </div>
        </div>
    );
}