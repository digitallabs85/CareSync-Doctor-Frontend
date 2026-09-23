"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { authService, notificationService } from "@/lib/apiService";
import { requestFcmToken } from "@/lib/firebase";
import { AndroidBridge } from "@/lib/AndroidBridge";

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
            AndroidBridge.notifyLoggedIn()

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
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow">
                <h1 className="text-xl font-semibold">Doctor Login</h1>

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded border px-3 py-2"
                />

                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full rounded border px-3 py-2 pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
                >
                    {loading ? "Logging in..." : "Login"}
                </button>
            </form>
        </div>
    );
}