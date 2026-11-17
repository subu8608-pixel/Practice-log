/**
 * Belly Dance Practice Log - IndexedDB Storage Layer
 * Manages practice sessions, video metadata/blobs, and timestamped feedback items.
 */

const DB_NAME = 'BellyDancePracticeLogDB';
const DB_VERSION = 1;

let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Sessions store
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        sessionStore.createIndex('date', 'date', { unique: false });
      }

      // Feedbacks store
      if (!db.objectStoreNames.contains('feedbacks')) {
        const feedbackStore = db.createObjectStore('feedbacks', { keyPath: 'id' });
        feedbackStore.createIndex('sessionId', 'sessionId', { unique: false });
        feedbackStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

const DB = {
  // Session methods
  async getAllSessions() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort descending by date / updatedAt
        const list = request.result || [];
        list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async getSession(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveSession(session) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      session.updatedAt = Date.now();
      if (!session.createdAt) session.createdAt = Date.now();
      const request = store.put(session);
      request.onsuccess = () => resolve(session);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteSession(sessionId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['sessions', 'feedbacks'], 'readwrite');
      const sessionStore = tx.objectStore('sessions');
      const feedbackStore = tx.objectStore('feedbacks');

      // Delete session
      sessionStore.delete(sessionId);

      // Delete associated feedbacks
      const index = feedbackStore.index('sessionId');
      const request = index.getAllKeys(sessionId);
      request.onsuccess = () => {
        const keys = request.result || [];
        keys.forEach((key) => feedbackStore.delete(key));
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  },

  // Feedback methods
  async getFeedbacks(sessionId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('feedbacks', 'readonly');
      const store = tx.objectStore('feedbacks');
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);

      request.onsuccess = () => {
        const list = request.result || [];
        // Sort chronologically by video timestamp
        list.sort((a, b) => a.timestamp - b.timestamp);
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async saveFeedback(feedback) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('feedbacks', 'readwrite');
      const store = tx.objectStore('feedbacks');
      feedback.updatedAt = Date.now();
      if (!feedback.createdAt) feedback.createdAt = Date.now();
      const request = store.put(feedback);
      request.onsuccess = () => resolve(feedback);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteFeedback(feedbackId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('feedbacks', 'readwrite');
      const store = tx.objectStore('feedbacks');
      const request = store.delete(feedbackId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  // Export & Import
  async exportData() {
    const sessions = await this.getAllSessions();
    const db = await openDB();
    const feedbacks = await new Promise((resolve, reject) => {
      const tx = db.transaction('feedbacks', 'readonly');
      const store = tx.objectStore('feedbacks');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    // Exclude heavy binary video blobs from JSON export for portable backup
    const sanitizedSessions = sessions.map((s) => {
      const copy = { ...s };
      delete copy.videoBlob;
      return copy;
    });

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      sessions: sanitizedSessions,
      feedbacks,
    };
  },

  async importData(data) {
    if (!data || !Array.isArray(data.sessions) || !Array.isArray(data.feedbacks)) {
      throw new Error('유효하지 않은 데이터 백업 형식입니다.');
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['sessions', 'feedbacks'], 'readwrite');
      const sessionStore = tx.objectStore('sessions');
      const feedbackStore = tx.objectStore('feedbacks');

      for (const s of data.sessions) {
        sessionStore.put(s);
      }
      for (const f of data.feedbacks) {
        feedbackStore.put(f);
      }

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  },
};

window.DB = DB;
