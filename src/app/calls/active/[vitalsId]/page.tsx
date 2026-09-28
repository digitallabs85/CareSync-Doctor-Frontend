"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, PhoneOff, User, FileText, Menu, ChevronDown } from "lucide-react";
import type { IAgoraRTCClient, IMicrophoneAudioTrack, ICameraVideoTrack } from "agora-rtc-sdk-ng";
import { consultService, notificationService, vitalsService } from "@/lib/apiService";
import { PatientInfoModal } from "@/app/components/PatientInfoModal";
import { PrescriptionModal } from "@/app/components/PrescriptionModal";

export default function ActiveCallPage() {
  const { vitalsId } = useParams<{ vitalsId: string }>();
  const router = useRouter();

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrack = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrack = useRef<ICameraVideoTrack | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remoteUserJoined, setRemoteUserJoined] = useState(false);
  const [ending, setEnding] = useState(false);

  const [isPatientInfoOpen, setIsPatientInfoOpen] = useState(false);
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [patientId, setPatientId] = useState<string | undefined>();
  const [patientToken, setPatientToken] = useState<string | undefined>();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    vitalsService.getPatientByVitalsId(vitalsId)
      .then((data) => {
        setPatientId(data.patientId);
        setPatientToken(data.token);
      })
      .catch((err) => console.error("Failed to fetch patient:", err));
  }, [vitalsId]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "video" && remoteVideoRef.current) {
          user.videoTrack?.play(remoteVideoRef.current);
          setRemoteUserJoined(true);
        }
        if (mediaType === "audio") {
          user.audioTrack?.play();
        }
      });

      client.on("user-unpublished", () => setRemoteUserJoined(false));
      client.on("user-left", () => setRemoteUserJoined(false));

      try {
        const { token, channelName, appId, uid } = await consultService.getAgoraToken(vitalsId);

        await client.join(appId, channelName, token, uid);

        const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localAudioTrack.current = micTrack;
        localVideoTrack.current = camTrack;

        if (localVideoRef.current) {
          camTrack.play(localVideoRef.current);
        }

        await client.publish([micTrack, camTrack]);

        if (mounted) setJoined(true);
      } catch (err) {
        console.error("Failed to join call:", err);
      }
    }

    init();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [vitalsId]);

  async function cleanup() {
    localAudioTrack.current?.close();
    localVideoTrack.current?.close();
    await clientRef.current?.leave();
  }

  async function handleToggleMic() {
    if (!localAudioTrack.current) return;
    const next = !micOn;
    await localAudioTrack.current.setEnabled(next);
    setMicOn(next);
  }

  async function handleToggleCam() {
    if (!localVideoTrack.current) return;
    const next = !camOn;
    await localVideoTrack.current.setEnabled(next);
    setCamOn(next);
  }

  async function handleEndCall() {
    setEnding(true);
    try {
      await notificationService.endCall(vitalsId, "completed");
    } catch (err) {
      console.error("End call error:", err);
    } finally {
      await cleanup();
      router.replace("/dashboard");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050505]">
      {/* ================= Modals ================= */}
      {isPatientInfoOpen && (
        <PatientInfoModal onClose={() => setIsPatientInfoOpen(false)} vitalsId={vitalsId} />
      )}

      {isPrescriptionOpen && (
        <PrescriptionModal
          onClose={() => setIsPrescriptionOpen(false)}
          patientId={patientId}
          patientToken={patientToken}
          vitalsId={vitalsId}
        />
      )}

      {/* ================= Remote Video (Main Canvas) ================= */}
      <div className="relative flex-1 overflow-hidden bg-[#0A0A0A]">
        {/* The actual video element container */}
        <div
          ref={remoteVideoRef}
          className="absolute inset-0 h-full w-full [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
        />

        {/* Waiting State */}
        {!remoteUserJoined && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0A] backdrop-blur-sm">
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/10"></span>
              <User size={32} className="text-white/40" />
            </div>
            <p className="text-lg font-bold tracking-wide text-white">
              {joined ? "Waiting for patient to join..." : "Connecting securely..."}
            </p>
            <p className="mt-2 text-sm font-medium text-white/50">
              Please keep this window open.
            </p>
          </div>
        )}
      </div>

      {/* ================= Local Video (PIP) ================= */}
      {/* Floating glass pane pushed to the bottom right corner */}
      <div className="absolute bottom-32 right-4 z-30 overflow-hidden rounded-2xl bg-slate-900 shadow-2xl ring-2 ring-white/20 sm:bottom-8 sm:right-8 sm:rounded-3xl">
        <div
          ref={localVideoRef}
          className="h-44 w-32 bg-slate-800 sm:h-56 sm:w-40 [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
        />
      </div>

      {/* ================= Top Left Actions Dropdown ================= */}
      <div className="absolute left-4 top-6 z-40 sm:left-6 sm:top-8">

        {/* Dropdown Trigger */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="group flex items-center gap-2.5 rounded-2xl bg-black/40 p-2 pr-4 backdrop-blur-xl ring-1 ring-white/10 transition-all hover:bg-black/60 hover:ring-white/30"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white transition-colors group-hover:bg-white/20">
            <Menu size={18} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-white">
            Actions
          </span>
          <ChevronDown
            size={14}
            className={`ml-1 text-white/50 transition-transform duration-300 ${isMenuOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown Menu (Scalable for future modals) */}
        {isMenuOpen && (
          <div className="absolute left-0 top-full mt-2 w-56 overflow-hidden rounded-2xl bg-black/60 p-1.5 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 animate-fade-in">
            <button
              onClick={() => {
                setIsPatientInfoOpen(true);
                setIsMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-white/10"
            >
              <User size={16} className="text-white/70 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-widest text-white">Patient Info</span>
            </button>

            <button
              onClick={() => {
                setIsPrescriptionOpen(true);
                setIsMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-white/10"
            >
              <FileText size={16} className="text-skeuo-red shrink-0" />
              <span className="text-xs font-bold uppercase tracking-widest text-white">Prescription</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= Bottom Control Dock ================= */}
      <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 rounded-[2.5rem] bg-black/50 px-6 py-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/10 sm:bottom-8 sm:gap-6 sm:px-8">

        {/* Toggle Mic */}
        <button
          onClick={handleToggleMic}
          className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full transition-all ${micOn
              ? "bg-white/20 text-white hover:bg-white/30"
              : "bg-white text-skeuo-text shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            }`}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={22} className="text-rose-500" />}
        </button>

        {/* End Call (Hero Button) */}
        <button
          onClick={handleEndCall}
          disabled={ending}
          className="group relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-skeuo-red text-white shadow-[0_8px_30px_rgba(220,38,38,0.4)] transition-all hover:bg-rose-700 hover:shadow-[0_8px_40px_rgba(220,38,38,0.6)] disabled:pointer-events-none disabled:opacity-50"
        >
          <div className="absolute inset-0 rounded-full border border-white/20"></div>
          {ending ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <PhoneOff size={28} className="transition-transform group-hover:scale-110" />
          )}
        </button>

        {/* Toggle Cam */}
        <button
          onClick={handleToggleCam}
          className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full transition-all ${camOn
              ? "bg-white/20 text-white hover:bg-white/30"
              : "bg-white text-skeuo-text shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            }`}
        >
          {camOn ? <Video size={20} /> : <VideoOff size={22} className="text-rose-500" />}
        </button>
      </div>

      {/* ================= Close Menu Overlay (Invisible) ================= */}
      {/* Clicking anywhere else on the screen will close the dropdown menu */}
      {isMenuOpen && (
        <div
          className="absolute inset-0 z-30"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
}