"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Power, LogOut, UserCog, Info, X, Loader2 } from "lucide-react";
import { config } from "../../../config";
import logo from "../../../public/logo.png"; // Adjust path if needed
import { authService, doctorService, notificationService } from "@/lib/apiService";
import { AndroidBridge } from "@/lib/AndroidBridge";

interface NavbarProps {
    status: "online" | "offline";
    setStatus: (status: "online" | "offline") => void;
}

export default function Navbar({ status, setStatus }: NavbarProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const router = useRouter();

    async function toggleStatus() {
        if (isTogglingStatus) return;
        setIsTogglingStatus(true);
        const next = status === "online" ? "offline" : "online";
        try {
            await doctorService.updateStatus(next);
            setStatus(next);
            AndroidBridge.notifyDoctorStatus(next);
        } catch (err) {
            console.error("Status update failed:", err);
        } finally {
            setIsTogglingStatus(false);
        }
    }

    async function handleLogout() {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            const fcmToken = localStorage.getItem("fcmToken");
            if (fcmToken) {
                await notificationService.removeFcmToken(fcmToken);
            }
            await authService.logout("Manual logout");
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            AndroidBridge.notifyLogout();
            localStorage.removeItem("doctorToken");
            localStorage.removeItem("doctor");
            localStorage.removeItem("fcmToken");
            router.replace("/login");
        }
    }

    return (
        <>
            {/* ================= Header ================= */}
            <header className="sticky top-0 z-40 border-b border-skeuo-surface/60 bg-white px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between">

                    {/* Left: Branding & Status */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button
                            onClick={() => setMenuOpen(true)}
                            aria-label="Open menu"
                            className="grid h-9 w-9 place-items-center rounded-lg bg-skeuo-surface/50 text-skeuo-text transition-all active:scale-95 md:hidden"
                        >
                            <Menu size={25} />
                        </button>

                        <div className="flex flex-col gap-1">
                            <h1 className="text-xl font-black tracking-tight text-skeuo-text leading-none">
                                Doctor
                            </h1>
                            <div className="flex items-center gap-1.5">
                                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${status === "online"
                                    ? " text-skeuo-green"
                                    : " text-skeuo-muted"
                                    }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${status === "online" ? "animate-pulse bg-skeuo-green" : "bg-skeuo-muted"}`} />
                                    {status === "online" ? "Receiving Calls" : "Offline"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="hidden rounded-lg bg-skeuo-surface/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-skeuo-muted md:inline">
                            v{config.version}
                        </span>

                        <Link
                            href="/profile"
                            className="hidden items-center gap-2 rounded-2xl bg-skeuo-base/50 px-4 py-2.5 text-sm font-bold text-skeuo-text transition-all hover:bg-skeuo-surface active:scale-95 md:flex"
                        >
                            <UserCog size={16} className="text-skeuo-muted" /> Profile
                        </Link>

                        {/* Primary Hero Button */}
                        <button
                            onClick={toggleStatus}
                            disabled={isTogglingStatus}
                            className={`group relative flex items-center gap-2 rounded-2xl px-4 py-2.5 sm:px-5 text-sm font-black transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-70 ${status === "online"
                                ? "bg-skeuo-red text-white shadow-lg shadow-skeuo-red/20 hover:bg-skeuo-red-dark"
                                : "bg-skeuo-green text-white shadow-lg shadow-skeuo-green/20 hover:bg-green-600"
                                }`}
                        >
                            {isTogglingStatus ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Power size={16} className={status === "online" ? "group-hover:animate-pulse" : ""} />
                            )}
                            <span className="hidden sm:inline">
                                {isTogglingStatus
                                    ? "Updating..."
                                    : status === "online" ? "Go Offline" : "Go Online"
                                }
                            </span>
                        </button>

                        <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="hidden items-center gap-2 rounded-2xl bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 transition-all hover:bg-rose-100 active:scale-95 disabled:opacity-50 md:flex"
                        >
                            {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                            {loggingOut ? "..." : "Sign Out"}
                        </button>
                    </div>
                </div>
            </header>

            {/* ================= Side Drawer (Mobile Native Feel) ================= */}

            {/* Dark Frosted Overlay */}
            <div
                onClick={() => setMenuOpen(false)}
                className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 md:hidden ${menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
            />

            {/* Drawer Panel */}
            <aside
                aria-hidden={!menuOpen}
                className={`fixed left-0 top-0 z-50 flex h-full w-72 max-w-[80%] transform-gpu flex-col rounded-r-xl bg-white  will-change-transform transition-transform duration-200 ease-out md:hidden ${menuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full "
                    }`}
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-skeuo-surface/60 px-5 py-5 mt-2">
                    <div className="flex items-center gap-3">
                        <Image src={logo} alt="logo" className="w-10 drop-shadow-sm" />
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-skeuo-text leading-tight">{config.app}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-skeuo-muted">Doctor Portal</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setMenuOpen(false)}
                        aria-label="Close menu"
                        className="grid h-9 w-9 place-items-center rounded-full bg-skeuo-surface/50 text-skeuo-muted transition-colors hover:bg-skeuo-surface hover:text-skeuo-text active:scale-95"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Drawer Links */}
                <nav className="flex flex-1 flex-col gap-2 p-4">
                    <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl bg-skeuo-base/50 px-4 py-3.5 font-bold text-skeuo-text transition-colors hover:bg-skeuo-surface active:scale-95"
                    >
                        <UserCog size={20} className="text-skeuo-muted" /> Update Profile
                    </Link>
                </nav>

                {/* Drawer Footer */}
                <div className="border-t border-skeuo-surface/60 p-4 pb-8">
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-skeuo-red/5 px-4 py-3.5 font-bold text-skeuo-red transition-colors hover:bg-skeuo-red/10 active:scale-95 disabled:opacity-50"
                    >
                        {loggingOut ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
                        {loggingOut ? "Signing out..." : "Sign Out"}
                    </button>
                    <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-skeuo-muted">
                        <Info size={12} /> Version {process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}
                    </div>
                </div>
            </aside>
        </>
    );
}