import { api } from "./api";

// ---------- AUTH / DOCTOR PROFILE ----------
export const authService = {
    login: (email: string, password: string) => api.post("/doctors/login", { email, password }),

    me: () => api.get("/doctors/me"),

    logout: (reason: string) => api.post("/doctors/logout", { reason }),
};

export const doctorService = {
    updateProfile: (doctorId: string, data: unknown) => api.put(`/doctors/${doctorId}`, data),

    changePassword: (oldPassword: string, newPassword: string) => api.patch("/doctors/change-password", { oldPassword, newPassword }),

    updateStatus: (status: "online" | "offline") => api.patch("/doctors/status", { status }),

    getQueue: () => api.get("/doctors/queue"),

    getAll: (clinicId?: string) => api.get(`/doctors${clinicId ? `?clinicId=${clinicId}` : ""}`),

    getClinicsForDoctor: (doctorId: string) => api.get(`/doctors/${doctorId}/clinics`),

    getDoctorsByClinic: (clinicId: string) => api.get(`/doctors/clinic/${clinicId}`),
};

// ---------- NOTIFICATIONS / CALLS ----------
export const notificationService = {
    saveFcmToken: (token: string) => api.post("/notifications/doctor-token", { token }),

    removeFcmToken: (fcmToken: string) => api.delete("/notifications/doctor-token", { fcmToken }),

    acceptCall: (vitalsId: string) => api.post("/notifications/accept-call", { vitalsId }),

    doctorDeclineCall: (vitalsId: string) => api.post("/notifications/doctor-decline-call", { vitalsId }),

    getCallStatus: (vitalsId: string) => api.get(`/notifications/call-status/${vitalsId}`),

    endCall: (vitalsId: string, reason?: string) => api.post("/notifications/end-call", { vitalsId, reason }),
};

// ---------- CONSULT / AGORA ----------
export const consultService = {
    getAgoraToken: (vitalsId: string) => api.get(`/consults/token/${vitalsId}`),
};

// ---------- VITALS ----------
// ---------- VITALS ---------- (add these two to existing vitalsService)
export const vitalsService = {
    save: (data: unknown) => api.post("/vitals", data),
    update: (id: string, data: unknown) => api.patch(`/vitals/${id}`, data),
    historyByPatient: (patientId: string) => api.get(`/vitals/patient/${patientId}`),
    historyByPhone: (phone: string) => api.get(`/vitals/history-by-phone/${phone}`),
    getPatientByVitalsId: (vitalsId: string) => api.get(`/vitals/${vitalsId}/patient`),
    getFullReport: (vitalsId: string) => api.get(`/vitals/${vitalsId}/full-report`),
};

// ---------- PATIENTS ----------
export const patientService = {
    find: (params: { phone?: string; mrNumber?: string }) => {
        const query = new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
        ).toString();
        return api.get(`/patients?${query}`);
    },

    verifyToken: (token: string) => api.get(`/patients/verify-token/${token}`),

    todayToken: (phone: string) => api.get(`/patients/today-token/${phone}`),

    getToday: () => api.get("/patients/today"),
};

// ---------- PRESCRIPTIONS ----------
export const prescriptionService = {
    save: (data: unknown) => api.post("/prescriptions", data),
    getTodayAll: () => api.get("/prescriptions/today"),
    getByVitalsId: (vitalsId: string) => api.get(`/prescriptions/by-vitals/${vitalsId}`),
    getById: (id: string) => api.get(`/prescriptions/${id}`),
};