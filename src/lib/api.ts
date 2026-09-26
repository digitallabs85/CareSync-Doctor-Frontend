const ACTUAL_URL = process.env.NEXT_PUBLIC_API_URL;
// const ACTUAL_URL = "http://localhost:5000";

const BASE_URL = `${ACTUAL_URL}/api`

async function request(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem("doctorToken");

    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (res.status === 401) {
        localStorage.removeItem("doctorToken");
        window.location.href = "/login";
        throw new Error("Unauthorized");
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Request failed");
    }

    return res.json();
}

export const api = {
    get: (path: string) => request(path, { method: "GET" }),
    post: (path: string, body?: unknown) =>
        request(path, { method: "POST", body: JSON.stringify(body) }),
    put: (path: string, body?: unknown) =>
        request(path, { method: "PUT", body: JSON.stringify(body) }),
    patch: (path: string, body?: unknown) =>
        request(path, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (path: string, body?: unknown) =>
        request(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),
};