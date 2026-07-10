/* RicoSquad PWA service worker
   전략: 페이지는 항상 네트워크 우선(최신 버전 보장) → 실패 시(오프라인) 캐시 폴백.
   사이트가 index.html 한 장이라 이 파일은 거의 손댈 일 없음 — 배포 때 버전 올릴 필요 없음. */
const CACHE = "ricosquad-v1";
const OFFLINE_URLS = ["/", "/index.html", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(OFFLINE_URLS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Firebase·번역 등 외부 요청은 건드리지 않음

  // 페이지 이동: 네트워크 우선 (항상 최신) → 오프라인이면 캐시
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("/index.html", copy)).catch(() => {});
        return res;
      }).catch(() => caches.match("/index.html"))
    );
    return;
  }
  // 정적 파일(아이콘·manifest): 캐시 우선 → 없으면 네트워크
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
