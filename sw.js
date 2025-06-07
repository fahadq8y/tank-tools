// 🔒 Tank Tools Service Worker - Enhanced PWA + Push Notifications
// Developer: Fahad - 17877
// Version: 4.0.0

const CACHE_NAME = 'tanktools-v4.0.0';
const CACHE_VERSION = '4.0.0';

// Files to cache for offline functionality
const CORE_ASSETS = [
  '/',
  '/login.html',
  '/dashboard.html', 
  '/index.html',
  '/plcr.html',
  '/NMOGASBL.html',
  '/icon.png',
  '/background.jpg',
  '/manifest.json'
];

// Network-first resources (always try network first)
const NETWORK_FIRST_PATTERNS = [
  '/api/',
  'https://cdn.jsdelivr.net/',
  'https://fonts.googleapis.com/',
  'https://wa.me/'
];

// Cache-first resources (try cache first, fallback to network)
const CACHE_FIRST_PATTERNS = [
  '/icon.png',
  '/background.jpg',
  '.css',
  '.js',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp'
];

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('🔧 Tank Tools SW: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Tank Tools SW: Caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('✅ Tank Tools SW: Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Tank Tools SW: Installation failed', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('🚀 Tank Tools SW: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Tank Tools SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Tank Tools SW: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle different caching strategies
  event.respondWith(handleRequest(request));
});

// Main request handler with intelligent caching
async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Network-first strategy for dynamic content
    if (shouldUseNetworkFirst(url.pathname)) {
      return await networkFirst(request);
    }
    
    // Cache-first strategy for static assets
    if (shouldUseCacheFirst(url.pathname)) {
      return await cacheFirst(request);
    }
    
    // Default: stale-while-revalidate for HTML pages
    return await staleWhileRevalidate(request);
    
  } catch (error) {
    console.error('🚨 Tank Tools SW: Request failed:', error);
    return await handleOfflineFallback(request);
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Cache-first strategy  
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then(networkResponse => {
      if (networkResponse.ok) {
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, networkResponse);
        });
      }
    }).catch(() => {
      // Ignore network errors for background updates
    });
    
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const networkResponsePromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, networkResponse.clone());
      });
    }
    return networkResponse;
  }).catch(() => {
    // Return cached response if network fails
    return cachedResponse;
  });
  
  return cachedResponse || await networkResponsePromise;
}

// Check if URL should use network-first strategy
function shouldUseNetworkFirst(pathname) {
  return NETWORK_FIRST_PATTERNS.some(pattern => 
    pathname.includes(pattern) || pathname.startsWith(pattern)
  );
}

// Check if URL should use cache-first strategy
function shouldUseCacheFirst(pathname) {
  return CACHE_FIRST_PATTERNS.some(pattern => 
    pathname.includes(pattern) || pathname.endsWith(pattern)
  );
}

// Offline fallback handler
async function handleOfflineFallback(request) {
  const url = new URL(request.url);
  
  // Try to return cached version
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // For HTML pages, return offline page if available
  if (request.destination === 'document') {
    const offlinePage = await caches.match('/login.html');
    if (offlinePage) {
      return offlinePage;
    }
  }
  
  // For images, return placeholder if available
  if (request.destination === 'image') {
    const placeholderImage = await caches.match('/icon.png');
    if (placeholderImage) {
      return placeholderImage;
    }
  }
  
  // Return basic offline response
  return new Response(
    `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - Tank Tools</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          text-align: center;
        }
        .offline-container {
          background: rgba(255, 255, 255, 0.1);
          padding: 40px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }
        .offline-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }
        .retry-btn {
          padding: 12px 24px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">📡</div>
        <h1>You're Offline</h1>
        <p>Tank Tools is not available offline.<br>Please check your internet connection.</p>
        <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
      </div>
    </body>
    </html>`,
    {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      },
      status: 503,
      statusText: 'Service Unavailable'
    }
  );
}

// Handle background sync for offline actions
self.addEventListener('sync', event => {
  console.log('🔄 Tank Tools SW: Background sync triggered:', event.tag);
  
  if (event.tag === 'tanktools-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data when connection is restored
async function syncOfflineData() {
  console.log('📤 Tank Tools SW: Syncing offline data...');
  
  try {
    // Get offline data from IndexedDB or localStorage
    const offlineData = await getOfflineData();
    
    if (offlineData && offlineData.length > 0) {
      // Send data to server when online
      for (const data of offlineData) {
        await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
      }
      
      // Clear offline data after successful sync
      await clearOfflineData();
      console.log('✅ Tank Tools SW: Offline data synced successfully');
    }
  } catch (error) {
    console.error('❌ Tank Tools SW: Sync failed:', error);
  }
}

// Get offline data (placeholder - implement based on your needs)
async function getOfflineData() {
  // Implementation depends on how you store offline data
  return [];
}

// Clear offline data after sync
async function clearOfflineData() {
  // Implementation depends on your storage method
}

// Handle push notifications - Enhanced for Tank Tools Admin
self.addEventListener('push', event => {
  console.log('🔔 Tank Tools SW: Push notification received');
  
  let notificationData = {
    title: 'Tank Tools Notification',
    body: 'You have a new notification',
    icon: '/icon.png',
    badge: '/icon.png'
  };
  
  if (event.data) {
    try {
      notificationData = {...notificationData, ...event.data.json()};
    } catch (error) {
      console.log('Using default notification data');
    }
  }
  
  // Enhanced options for Tank Tools
  const options = {
    title: notificationData.title,
    body: notificationData.body,
    icon: '/icon.png',
    badge: '/icon.png',
    tag: 'tanktools-admin-notification',
    requireInteraction: true,
    silent: false,
    renotify: true,
    timestamp: Date.now(),
    actions: [
      {
        action: 'open_dashboard',
        title: '🔐 Open Dashboard',
        icon: '/icon.png'
      },
      {
        action: 'view_pending',
        title: '⏳ View Pending',
        icon: '/icon.png'
      },
      {
        action: 'dismiss',
        title: '❌ Dismiss'
      }
    ],
    data: {
      url: notificationData.url || '/dashboard.html',
      action: notificationData.action || 'dashboard',
      username: notificationData.username,
      timestamp: Date.now()
    },
    vibrate: [200, 100, 200] // For mobile devices
  };
  
  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Handle notification clicks - Enhanced for Tank Tools
self.addEventListener('notificationclick', event => {
  console.log('👆 Tank Tools SW: Notification clicked', event.action);
  
  event.notification.close();
  
  let urlToOpen = '/dashboard.html';
  
  // Handle different actions
  switch (event.action) {
    case 'open_dashboard':
      urlToOpen = '/dashboard.html';
      break;
    case 'view_pending':
      urlToOpen = '/dashboard.html#pending';
      break;
    case 'dismiss':
      return; // Just close notification
    default:
      // Default click (no action button)
      urlToOpen = event.notification.data?.url || '/dashboard.html';
      
      // If notification has pending user data, go to pending section
      if (event.notification.data?.action === 'pending') {
        urlToOpen = '/dashboard.html#pending';
      }
      break;
  }
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // Check if Tank Tools Dashboard is already open
      for (const client of clientList) {
        if (client.url.includes('/dashboard.html') && 'focus' in client) {
          // If dashboard is open, focus it and send message to show pending users
          if (event.notification.data?.action === 'pending' || event.action === 'view_pending') {
            client.postMessage({
              type: 'SHOW_PENDING_USERS',
              timestamp: Date.now()
            });
          }
          return client.focus();
        }
      }
      
      // If Tank Tools is open but not dashboard, navigate to dashboard
      for (const client of clientList) {
        if (client.url.includes('tanktools') || client.url.includes('login.html') || client.url.includes('index.html')) {
          if ('navigate' in client) {
            return client.navigate(urlToOpen).then(() => client.focus());
          } else {
            client.postMessage({
              type: 'NAVIGATE_TO',
              url: urlToOpen
            });
            return client.focus();
          }
        }
      }
      
      // Otherwise open new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', event => {
  console.log('🔕 Tank Tools SW: Notification closed', event.notification.tag);
  
  // Track notification dismissal for analytics
  event.waitUntil(
    clients.matchAll().then(clientList => {
      clientList.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATION_CLOSED',
          tag: event.notification.tag,
          timestamp: Date.now()
        });
      });
    })
  );
});

// Handle messages from main thread - Enhanced
self.addEventListener('message', event => {
  console.log('💬 Tank Tools SW: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_VERSION,
      cacheName: CACHE_NAME,
      features: ['push-notifications', 'offline-support', 'admin-alerts']
    });
  }
  
  // Handle admin notification requests
  if (event.data && event.data.type === 'SEND_ADMIN_NOTIFICATION') {
    const { title, body, data } = event.data;
    
    const notificationOptions = {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
      tag: 'tanktools-admin-alert',
      requireInteraction: true,
      data: data || {}
    };
    
    event.waitUntil(
      self.registration.showNotification(title, notificationOptions)
    );
  }
  
  // Handle registration notification (from login page)
  if (event.data && event.data.type === 'NEW_USER_REGISTERED') {
    const { username, fullName } = event.data;
    
    const notificationOptions = {
      body: `${fullName || username} needs admin approval`,
      icon: '/icon.png',
      badge: '/icon.png',
      tag: 'new-user-registration',
      requireInteraction: true,
      actions: [
        {
          action: 'view_pending',
          title: '⏳ Review Now',
          icon: '/icon.png'
        },
        {
          action: 'dismiss',
          title: '❌ Later'
        }
      ],
      data: {
        action: 'pending',
        username,
        fullName,
        url: '/dashboard.html#pending'
      },
      vibrate: [200, 100, 200, 100, 200]
    };
    
    event.waitUntil(
      self.registration.showNotification('🔔 New User Registration', notificationOptions)
    );
  }
});

// Enhanced error handling for Tank Tools
self.addEventListener('error', event => {
  console.error('❌ Tank Tools SW: Error occurred:', event.error);
  
  // Send error to main thread for logging
  clients.matchAll().then(clientList => {
    clientList.forEach(client => {
      client.postMessage({
        type: 'SW_ERROR',
        error: event.error.message,
        timestamp: Date.now()
      });
    });
  });
});

self.addEventListener('unhandledrejection', event => {
  console.error('❌ Tank Tools SW: Unhandled promise rejection:', event.reason);
  
  // Send error to main thread for logging
  clients.matchAll().then(clientList => {
    clientList.forEach(client => {
      client.postMessage({
        type: 'SW_PROMISE_REJECTION',
        reason: event.reason,
        timestamp: Date.now()
      });
    });
  });
});

// Periodic background sync for Tank Tools admin notifications
self.addEventListener('periodicsync', event => {
  if (event.tag === 'tanktools-admin-check') {
    event.waitUntil(checkForAdminUpdates());
  }
});

// Check for admin updates (placeholder)
async function checkForAdminUpdates() {
  console.log('🔍 Tank Tools SW: Checking for admin updates...');
  
  try {
    // This would check Firebase for pending users, new activities, etc.
    // Implementation depends on your backend API
    
    // Example: Check for pending users
    const response = await fetch('/api/admin/pending-count');
    if (response.ok) {
      const data = await response.json();
      
      if (data.pendingCount > 0) {
        await self.registration.showNotification('🔔 Tank Tools Admin Alert', {
          body: `${data.pendingCount} users awaiting approval`,
          icon: '/icon.png',
          badge: '/icon.png',
          tag: 'periodic-admin-check',
          data: { action: 'pending' }
        });
      }
    }
  } catch (error) {
    console.log('🔍 Admin check failed (normal if offline):', error.message);
  }
}

console.log('🚀 Tank Tools Service Worker v4.0.0 loaded successfully');
console.log('🔒 Developed by Fahad - 17877');
console.log('🔔 Enhanced with Push Notifications for Admin');
console.log('🏢 Kuwait National Petroleum Company');