const CACHE_NAME = "alpalist-hoa-v4";
const STATIC_CACHE = "alpalist-static-v4";
const DYNAMIC_CACHE = "alpalist-dynamic-v4";
const API_CACHE = "alpalist-api-v4";

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/login-avatar.png",
  "/login-avatar-circle.png",
];

const isLocalhost = Boolean(
  self.location.hostname === "localhost" ||
  self.location.hostname === "[::1]" ||
  self.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

/**
 * Cache First
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    // Do NOT force redirect behavior.
    const network = await fetch(request);

    if (network.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, network.clone());
    }

    return network;
  } catch (error) {
    throw error;
  }
}

/**
 * Network First
 */
async function networkFirst(request) {
  try {
    // Do NOT force redirect behavior.
    const network = await fetch(request);

    if (network.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, network.clone());
    }

    return network;
  } catch (error) {
    const cached = await caches.match(request);

    if (cached) {
      return cached;
    }

    throw new Error("Network unavailable and no cached data");
  }
}

/**
 * Stale While Revalidate
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  if (cached) {
    // Update the cache in the background.
    fetch(request)
      .then(async (network) => {
        if (network.ok) {
          const cache = await caches.open(DYNAMIC_CACHE);
          await cache.put(request, network.clone());
        }
      })
      .catch(() => {
        // Ignore background network errors.
      });

    return cached;
  }

  try {
    const network = await fetch(request);

    if (network.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, network.clone());
    }

    return network;
  } catch (error) {
    return new Response("Network error", {
      status: 503,
      statusText: "Service Unavailable",
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}

/**
 * INSTALL
 */
self.addEventListener("install", (event) => {
  if (isLocalhost) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => {
        // Don't fail service-worker installation
        // if one static asset cannot be cached.
      })
  );

  self.skipWaiting();
});

/**
 * ACTIVATE
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (
              key !== STATIC_CACHE &&
              key !== DYNAMIC_CACHE &&
              key !== API_CACHE &&
              key !== CACHE_NAME
            ) {
              return caches.delete(key);
            }

            return undefined;
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * FETCH
 */
self.addEventListener("fetch", (event) => {
  if (isLocalhost) {
    return;
  }

  const request = event.request;

  // Only handle GET requests.
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /**
   * IMPORTANT:
   *
   * Never intercept authentication/login/navigation redirects.
   *
   * Next.js middleware, Supabase authentication, etc. may return
   * redirects. Let the browser handle those normally.
   */
  if (
    url.pathname === "/login" ||
    url.pathname.startsWith("/login/") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/api/auth")
  ) {
    return;
  }

  /**
   * Never interfere with Supabase requests.
   */
  if (url.hostname.includes("supabase.co")) {
    return;
  }

  /**
   * IMPORTANT:
   *
   * Navigation requests are allowed to go directly to the network.
   *
   * This prevents the service worker from interfering with:
   *
   * /login
   * /dashboard
   * middleware redirects
   * authentication redirects
   * Next.js navigation
   */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match("/");

        if (cached) {
          return cached;
        }

        return new Response("Offline - No cached version available", {
          status: 503,
          statusText: "Service Unavailable",
          headers: {
            "Content-Type": "text/plain",
          },
        });
      })
    );

    return;
  }

  /**
   * API ROUTES
   *
   * Network first with cache fallback.
   */
  if (url.pathname.startsWith("/api")) {
    event.respondWith(
      networkFirst(request).catch(() => {
        return new Response(
          JSON.stringify({
            error: "Offline - API unavailable",
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      })
    );

    return;
  }

  /**
   * Next.js internal assets
   *
   * Cache first.
   */
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/__next")
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  /**
   * Static assets
   */
  if (
    STATIC_ASSETS.some(
      (asset) =>
        url.pathname === asset ||
        url.pathname.endsWith(asset)
    )
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  /**
   * Other GET requests
   *
   * Stale while revalidate.
   */
  event.respondWith(staleWhileRevalidate(request));
});
