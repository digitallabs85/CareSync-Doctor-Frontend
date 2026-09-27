"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Phone, PhoneOff, ChevronsRight, ChevronsLeft, Loader2 } from "lucide-react";
import { notificationService } from "@/lib/apiService";
import { AndroidBridge } from "@/lib/AndroidBridge";

export default function IncomingCallPage() {
    const { vitalsId } = useParams<{ vitalsId: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();
    const patientName = searchParams.get("name") || "Patient";
    const [loading, setLoading] = useState(false);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    // --- Drag Slider State ---
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    
    // Config for the slider physics
    const MAX_DRAG = 110; // Max pixels the button can move left/right
    const TRIGGER_THRESHOLD = 90; // Pixels required to trigger the action

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
            setDragX(0); // Reset if failed
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

    // --- Drag Handlers ---
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (loading) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true);
        startX.current = e.clientX - dragX;
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging || loading) return;
        let currentX = e.clientX - startX.current;
        
        // Clamp the drag distance
        if (currentX > MAX_DRAG) currentX = MAX_DRAG;
        if (currentX < -MAX_DRAG) currentX = -MAX_DRAG;
        
        setDragX(currentX);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging || loading) return;
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);

        if (dragX > TRIGGER_THRESHOLD) {
            setDragX(MAX_DRAG); // Lock to the right
            handleAccept();
        } else if (dragX < -TRIGGER_THRESHOLD) {
            setDragX(-MAX_DRAG); // Lock to the left
            handleDecline();
        } else {
            setDragX(0); // Snap back to center if not dragged far enough
        }
    };

    // Calculate background color opacity for the thumb based on direction
    const dragPercentage = dragX / MAX_DRAG;
    const thumbBgColor = 
        dragPercentage > 0 
            ? `rgba(34, 197, 94, ${Math.min(dragPercentage + 0.1, 1)})` // Emerald-500 fading in
            : dragPercentage < 0
                ? `rgba(239, 68, 68, ${Math.min(Math.abs(dragPercentage) + 0.1, 1)})` // Rose-500 fading in
                : "white";

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-900 text-white overflow-hidden">
            
            {/* Background ambient glow based on drag direction */}
            <div 
                className="absolute inset-0 opacity-20 transition-colors duration-200"
                style={{ 
                    backgroundColor: dragX > 0 ? '#22c55e' : dragX < 0 ? '#ef4444' : 'transparent' 
                }}
            />

            {/* Top Section: Caller Info */}
            <div className="relative z-10 flex flex-col items-center gap-6 mt-24">
                <div className="relative">
                    {/* Pulsing rings behind avatar */}
                    <div className="absolute inset-0 rounded-full bg-white/10 animate-ping opacity-75 [animation-duration:2s]" />
                    <div className="absolute -inset-4 rounded-full bg-white/5 animate-ping opacity-50 [animation-duration:2s] [animation-delay:0.5s]" />
                    
                    <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-slate-800 border-4 border-slate-700 shadow-2xl text-5xl font-black text-slate-300">
                        {patientName.charAt(0).toUpperCase()}
                    </div>
                </div>
                
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-white shadow-sm">{patientName}</h1>
                    <p className="text-sm font-medium text-slate-400 uppercase tracking-widest animate-pulse">
                        Incoming Video Call...
                    </p>
                </div>
            </div>

            {/* Bottom Section: Drag to Answer Slider */}
            <div className="relative z-10 flex w-full max-w-sm justify-center px-6 pb-16">
                
                {/* The Track */}
                <div className="relative flex h-20 w-full items-center justify-center overflow-hidden rounded-full bg-slate-800/80 shadow-inner backdrop-blur-xl border border-slate-700/50">
                    
                    {/* Left Icon (Decline) */}
                    <div className="absolute left-5 flex items-center justify-center opacity-60">
                        <PhoneOff size={24} className="text-rose-500" />
                    </div>

                    {/* Right Icon (Accept) */}
                    <div className="absolute right-5 flex items-center justify-center opacity-60">
                        <Phone size={24} className="text-emerald-500" />
                    </div>

                    {/* Animated Helper Arrows (Fade out when dragging) */}
                    <div 
                        className="absolute flex w-full items-center justify-between px-14 pointer-events-none transition-opacity duration-300"
                        style={{ opacity: dragX === 0 ? 0.3 : 0 }}
                    >
                        <ChevronsLeft size={20} className="text-rose-400 animate-pulse" />
                        <ChevronsRight size={20} className="text-emerald-400 animate-pulse" />
                    </div>

                    {/* The Draggable Thumb */}
                    <div
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        className={`absolute z-10 flex h-16 w-16 cursor-grab touch-none items-center justify-center rounded-full shadow-lg ${isDragging ? 'cursor-grabbing' : 'transition-transform duration-300 ease-out'}`}
                        style={{ 
                            transform: `translateX(${dragX}px)`,
                            backgroundColor: thumbBgColor,
                            color: dragX !== 0 ? 'white' : '#0f172a' // Slate-900
                        }}
                    >
                        {loading ? (
                            <Loader2 size={28} className="animate-spin text-white" />
                        ) : (
                            <Phone 
                                size={28} 
                                className={`transition-transform duration-200 ${dragX > 0 ? 'scale-110' : dragX < 0 ? 'rotate-[135deg] scale-110' : 'animate-bounce'}`} 
                            />
                        )}
                    </div>
                    
                </div>
            </div>
        </div>
    );
}