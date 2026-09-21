"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, PhoneOff, User, FileText } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
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

      <div ref={remoteVideoRef} className="relative flex-1 bg-slate-900">
        {!remoteUserJoined && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            {joined ? "Waiting for patient to join..." : "Connecting..."}
          </div>
        )}
      </div>

      <div
        ref={localVideoRef}
        className="absolute bottom-24 right-4 h-40 w-28 overflow-hidden rounded-lg border-2 border-white/20 bg-slate-800"
      />

      <div className="absolute top-5 left-3 z-20 flex flex-col gap-2">
        <button
          onClick={() => setIsPatientInfoOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-700 text-white"
        >
          <User size={18} />
        </button>
        <button
          onClick={() => setIsPrescriptionOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0297d6] text-white"
        >
          <FileText size={18} />
        </button>
      </div>

      <div className="flex items-center justify-center gap-6 bg-black/80 py-6">
        <button
          onClick={handleToggleMic}
          className={`flex h-14 w-14 items-center justify-center rounded-full ${micOn ? "bg-slate-700" : "bg-red-600"} text-white`}
        >
          {micOn ? <Mic size={22} /> : <MicOff size={22} />}
        </button>
        <button
          onClick={handleEndCall}
          disabled={ending}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white disabled:opacity-50"
        >
          <PhoneOff size={26} />
        </button>
        <button
          onClick={handleToggleCam}
          className={`flex h-14 w-14 items-center justify-center rounded-full ${camOn ? "bg-slate-700" : "bg-red-600"} text-white`}
        >
          {camOn ? <Video size={22} /> : <VideoOff size={22} />}
        </button>
      </div>
    </div>
  );
}