// RACEBOOK PWA Custom Push Service Worker Handler

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "RACEBOOK 대회 알림", body: event.data.text() };
    }
  }

  const title = data.title || "RACEBOOK 마라톤 알림";
  const options = {
    body: data.body || "접수하신 마라톤 대회 일정을 확인하세요!",
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    vibrate: [200, 100, 200],
    tag: data.tag || "race-dday-notification",
    renotify: true,
    data: {
      url: data.url || "./",
      raceId: data.raceId || null
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "./";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // 이미 열려 있는 창이 있으면 포커스
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      // 창이 없으면 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
