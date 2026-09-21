"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { listenForForegroundMessages } from "@/lib/firebase";

export default function IncomingCallListener() {
  const router = useRouter();

 useEffect(() => {
  const token = localStorage.getItem("doctorToken");
  console.log("[IncomingCallListener] mounted, has token:", !!token);
  if (!token) return;

  listenForForegroundMessages((payload) => {
    console.log("[IncomingCallListener] payload data:", payload?.data);
    const data = payload?.data;
    if (data?.type === "incoming_call" && data?.vitalsId) {
      console.log("[IncomingCallListener] navigating to incoming call screen");
      router.push(`/calls/incoming/${data.vitalsId}?name=${encodeURIComponent(data.patientName || "Patient")}`);
    }
  });
}, [router]);

  return null;
}