"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { authService, notificationService } from "@/lib/apiService";
import { requestFcmToken } from "@/lib/firebase";
import { AndroidBridge } from "@/lib/AndroidBridge";
import Image from "next/image";
import logo from "../../../public/logo.png";
import { config } from "../../../config";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const result = await authService.login(email, password);
            localStorage.setItem("doctorToken", result.token);
            localStorage.setItem("doctor", JSON.stringify(result.doctor));
            AndroidBridge.notifyLoggedIn();

            console.log("about to request fcm token");
            try {
                if (AndroidBridge.isAvailable()) {
                    console.log("Running inside native app — skipping web push token");
                } else {
                    const fcmToken = await requestFcmToken();
                    console.log("fcm token result:", fcmToken);
                    if (fcmToken) {
                        await notificationService.saveFcmToken(fcmToken);
                        console.log("fcm token saved to backend");
                    }
                }
            } catch (err) {
                console.error("fcm error:", err);
            }

            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Invalid email or password.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-skeuo-base px-2 py-8 sm:px-6 sm:py-12 lg:px-8 relative overflow-hidden">


            {/* ================= The "Shell" (Card Alternative) ================= */}
            <div className="w-full max-w-md">
                {/* Inner Crisp Container */}
                <div className="w-full overflow-hidden rounded-xl bg-white shadow-sm border border-skeuo-surface/50 py-12 sm:py-6">

                    {/* ================= Header Branding ================= */}
                    <div className="flex flex-col items-center bg-white px-2 text-center sm:px-8 sm:pb-10">
                        <Image
                            src={logo}
                            alt={`${config.app} Logo`}
                            className="w-[6rem] pb-3"
                            priority
                        />
                        <h1 className="text-2xl font-black tracking-tight text-skeuo-text">
                            {config.app}
                        </h1>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-skeuo-muted">
                            Doctor Portal
                        </p>
                    </div>

                    {/* Subtle segmented dashed divider */}
                    <div className="relative mx-4 flex items-center sm:mx-10 py-2">
                        <div className="h-px w-full border-t border-dashed border-skeuo-surface"></div>
                    </div>

                    {/* ================= Login Form ================= */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-6 sm:px-10 sm:pt-10">

                        {/* Email Input */}
                        <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-skeuo-muted">
                                Email Address
                            </label>
                            <div className="group relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted transition-colors group-focus-within:text-skeuo-red" />
                                <input
                                    type="email"
                                    placeholder="doctor@clinic.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full rounded-xl border-2 border-skeuo-surface bg-skeuo-base/30 py-2.5 pl-11 pr-4 text-sm font-medium text-skeuo-text outline-none transition-all placeholder:text-skeuo-muted/60 focus:border-skeuo-red focus:bg-white focus:ring-4 focus:ring-skeuo-red/10 placeholder:text-sm"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-skeuo-muted">
                                Password
                            </label>
                            <div className="group relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-skeuo-muted transition-colors group-focus-within:text-skeuo-red" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full rounded-xl border-2 border-skeuo-surface bg-skeuo-base/30 py-2.5 pl-11 pr-12 text-sm font-medium text-skeuo-text outline-none transition-all placeholder:text-skeuo-muted/60 focus:border-skeuo-red focus:bg-white focus:ring-4 focus:ring-skeuo-red/10 placeholder:text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-skeuo-muted transition-colors hover:bg-skeuo-surface hover:text-skeuo-text"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 animate-fade-in">
                                <AlertCircle size={18} className="shrink-0 text-rose-600" />
                                <p className="text-sm font-semibold text-rose-600">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-skeuo-red py-4 text-base font-bold text-white shadow-md transition-all hover:bg-skeuo-red-dark hover:shadow-lg hover:shadow-skeuo-red/20 disabled:pointer-events-none disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <span>Secure Login</span>
                            )}
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
}