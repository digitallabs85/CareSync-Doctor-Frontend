importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyA9YUDjRHPNqY3gdzU6l0n0y8OlQ_x52UM",
    authDomain: "caresync-9765b.firebaseapp.com",
    projectId: "caresync-9765b",
    storageBucket: "caresync-9765b.firebasestorage.app",
    messagingSenderId: "555210878951",
    appId: "1:555210878951:web:ede8a7866e664033609742",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log("[SW] background message received:", payload);
    const { title, body, icon } = payload.notification || {};
    self.registration.showNotification(title || "New notification", {
        body,
        icon: icon || "/icons/icon-192.png",
        data: payload.data,
    });
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const link = event.notification.data?.fcmOptions?.link || "/";
    event.waitUntil(clients.openWindow(link));
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));