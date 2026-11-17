/**
 * Belly Dance Practice Log - Main Application Logic
 * Clean Minimalist UI - No Emojis
 */

(function () {
  'use strict';

  // Application State
  const state = {
    currentSession: null,
    feedbacks: [],
    videoFile: null,
    videoUrl: null,
    isPlaying: false,
    isMirrored: false,
    playbackRate: 1.0,
    abRepeat: {
      enabled: false,
      a: null,
      b: null,
    },
    activeFilter: 'all',
    activeCategory: 'all',
    editingFeedbackId: null,
    capturedThumbnail: null,
    capturedTimestamp: 0,
    segmentPlayTimer: null,
  };

  // DOM Elements
  const el = {
    // Video
    mainVideo: document.getElementById('mainVideo'),
    videoViewport: document.getElementById('videoViewport'),
    videoEmptyState: document.getElementById('videoEmptyState'),
    videoFileInput: document.getElementById('videoFileInput'),
    mirrorBadge: document.getElementById('mirrorBadge'),
    btnChangeVideo: document.getElementById('btnChangeVideo'),
    btnToggleMirror: document.getElementById('btnToggleMirror'),

    // Player Controls
    btnPlayPause: document.getElementById('btnPlayPause'),
    playIcon: document.getElementById('playIcon'),
    pauseIcon: document.getElementById('pauseIcon'),
    playText: document.getElementById('playText'),
    timeCurrent: document.getElementById('timeCurrent'),
    timeDuration: document.getElementById('timeDuration'),
    btnStepBackSec: document.getElementById('btnStepBackSec'),
    btnStepBackFrame: document.getElementById('btnStepBackFrame'),
    btnStepFwdFrame: document.getElementById('btnStepFwdFrame'),
    btnStepFwdSec: document.getElementById('btnStepFwdSec'),
    btnMarkFeedback: document.getElementById('btnMarkFeedback'),

    // Scrub Bar
    scrubContainer: document.getElementById('scrubContainer'),
    scrubTrack: document.getElementById('scrubTrack'),
    scrubProgress: document.getElementById('scrubProgress'),
    scrubMarkers: document.getElementById('scrubMarkers'),
    scrubHoverTime: document.getElementById('scrubHoverTime'),
    scrubAbRange: document.getElementById('scrubAbRange'),

    // AB Loop & Speed
    btnSetA: document.getElementById('btnSetA'),
    btnSetB: document.getElementById('btnSetB'),
    btnToggleLoop: document.getElementById('btnToggleLoop'),
    btnClearAB: document.getElementById('btnClearAB'),
    abDisplay: document.getElementById('abDisplay'),
    speedGroup: document.getElementById('speedGroup'),

    // Session Meta
    inputSessionTitle: document.getElementById('inputSessionTitle'),
    inputSessionDate: document.getElementById('inputSessionDate'),
    selectSessionCategory: document.getElementById('selectSessionCategory'),
    focusPillsContainer: document.getElementById('focusPillsContainer'),
    inputNewFocusTag: document.getElementById('inputNewFocusTag'),
    btnSaveSessionMeta: document.getElementById('btnSaveSessionMeta'),
    textareaSessionSummary: document.getElementById('textareaSessionSummary'),
    summarySaveStatus: document.getElementById('summarySaveStatus'),

    // Feedbacks
    feedbackListContainer: document.getElementById('feedbackListContainer'),
    countTotal: document.getElementById('countTotal'),
    countPending: document.getElementById('countPending'),
    countResolved: document.getElementById('countResolved'),
    statusFilterTabs: document.getElementById('statusFilterTabs'),
    selectCategoryFilter: document.getElementById('selectCategoryFilter'),

    // Feedback Modal
    feedbackModal: document.getElementById('feedbackModal'),
    feedbackModalTitle: document.getElementById('feedbackModalTitle'),
    btnCloseFeedbackModal: document.getElementById('btnCloseFeedbackModal'),
    btnCancelFeedback: document.getElementById('btnCancelFeedback'),
    btnSaveFeedback: document.getElementById('btnSaveFeedback'),
    modalPreviewThumb: document.getElementById('modalPreviewThumb'),
    modalPreviewTimestamp: document.getElementById('modalPreviewTimestamp'),
    modalCategoryChips: document.getElementById('modalCategoryChips'),
    inputFeedbackIssue: document.getElementById('inputFeedbackIssue'),
    inputFeedbackSolution: document.getElementById('inputFeedbackSolution'),
    inputFeedbackResolved: document.getElementById('inputFeedbackResolved'),

    // Drawer & Session History
    btnOpenHistory: document.getElementById('btnOpenHistory'),
    sessionDrawer: document.getElementById('sessionDrawer'),
    btnCloseDrawer: document.getElementById('btnCloseDrawer'),
    sessionListContainer: document.getElementById('sessionListContainer'),
    sessionCountBadge: document.getElementById('sessionCountBadge'),
    btnNewSession: document.getElementById('btnNewSession'),
    btnDrawerNewSession: document.getElementById('btnDrawerNewSession'),

    // Export / Print / Backup
    btnExportText: document.getElementById('btnExportText'),
    btnPrintReport: document.getElementById('btnPrintReport'),
    btnBackupRestore: document.getElementById('btnBackupRestore'),
    backupModal: document.getElementById('backupModal'),
    btnCloseBackupModal: document.getElementById('btnCloseBackupModal'),
    btnDismissBackup: document.getElementById('btnDismissBackup'),
    btnDownloadBackup: document.getElementById('btnDownloadBackup'),
    inputRestoreFile: document.getElementById('inputRestoreFile'),

    // Canvas & Toast
    snapshotCanvas: document.getElementById('snapshotCanvas'),
    toastContainer: document.getElementById('toastContainer'),
  };

  // Utilities
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds === null || seconds < 0) return '00:00.0';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${mm}:${ss}.${ms}`;
  }

  function getTodayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function showToast(message, duration = 2800) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Session Management
  function createBlankSession() {
    return {
      id: 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: '벨리댄스 테크닉 연습',
      date: getTodayString(),
      category: '베이직 테크닉',
      focusAreas: ['상체 고정', '골반 가동 범위'],
      summary: '',
      videoMeta: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  async function loadInitialSession() {
    try {
      const sessions = await DB.getAllSessions();
      updateSessionBadge(sessions.length);

      if (sessions.length > 0) {
        state.currentSession = sessions[0];
      } else {
        const initial = createBlankSession();
        await DB.saveSession(initial);
        state.currentSession = initial;
        updateSessionBadge(1);
      }
      applySessionToUI();
      await loadFeedbacks();
    } catch (err) {
      console.error('Failed to load session:', err);
      state.currentSession = createBlankSession();
      applySessionToUI();
    }
  }

  function updateSessionBadge(count) {
    el.sessionCountBadge.textContent = count;
  }

  function applySessionToUI() {
    if (!state.currentSession) return;
    el.inputSessionTitle.value = state.currentSession.title || '';
    el.inputSessionDate.value = state.currentSession.date || getTodayString();
    el.selectSessionCategory.value = state.currentSession.category || '베이직 테크닉';
    el.textareaSessionSummary.value = state.currentSession.summary || '';
    renderFocusPills();
  }

  function renderFocusPills() {
    el.focusPillsContainer.innerHTML = '';
    const tags = state.currentSession.focusAreas || [];
    tags.forEach((tag, idx) => {
      const pill = document.createElement('span');
      pill.className = 'focus-pill';
      pill.innerHTML = `
        ${escapeHtml(tag)}
        <button type="button" data-idx="${idx}" title="삭제">
          <svg style="width:12px;height:12px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
      pill.querySelector('button').addEventListener('click', () => {
        state.currentSession.focusAreas.splice(idx, 1);
        renderFocusPills();
        saveCurrentSession();
      });
      el.focusPillsContainer.appendChild(pill);
    });
  }

  async function saveCurrentSession() {
    if (!state.currentSession) return;
    state.currentSession.title = el.inputSessionTitle.value.trim() || '무제 연습일지';
    state.currentSession.date = el.inputSessionDate.value || getTodayString();
    state.currentSession.category = el.selectSessionCategory.value;
    state.currentSession.summary = el.textareaSessionSummary.value;
    await DB.saveSession(state.currentSession);
  }

  // Summary Auto-save
  let summaryDebounceTimer = null;
  el.textareaSessionSummary.addEventListener('input', () => {
    el.summarySaveStatus.textContent = '입력 중...';
    clearTimeout(summaryDebounceTimer);
    summaryDebounceTimer = setTimeout(async () => {
      await saveCurrentSession();
      el.summarySaveStatus.textContent = '자동 저장됨';
    }, 600);
  });

  el.inputSessionTitle.addEventListener('change', saveCurrentSession);
  el.inputSessionDate.addEventListener('change', saveCurrentSession);
  el.selectSessionCategory.addEventListener('change', saveCurrentSession);
  el.btnSaveSessionMeta.addEventListener('click', async () => {
    await saveCurrentSession();
    showToast('일지 기본 정보가 저장되었습니다.');
  });

  el.inputNewFocusTag.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = el.inputNewFocusTag.value.trim();
      if (val) {
        if (!state.currentSession.focusAreas) state.currentSession.focusAreas = [];
        if (!state.currentSession.focusAreas.includes(val)) {
          state.currentSession.focusAreas.push(val);
          renderFocusPills();
          saveCurrentSession();
        }
        el.inputNewFocusTag.value = '';
      }
    }
  });

  // Video Loading & Management
  function handleVideoFile(file) {
    if (!file || !file.type.startsWith('video/')) {
      showToast('유효한 영상 파일을 선택해주세요.');
      return;
    }
    state.videoFile = file;
    if (state.videoUrl) {
      URL.revokeObjectURL(state.videoUrl);
    }
    state.videoUrl = URL.createObjectURL(file);
    el.mainVideo.src = state.videoUrl;
    el.videoEmptyState.style.display = 'none';
    el.btnChangeVideo.style.display = 'inline-flex';

    el.mainVideo.onloadedmetadata = () => {
      el.timeDuration.textContent = formatTime(el.mainVideo.duration);
      renderScrubberMarkers();
      showToast(`영상 로드 완료: ${file.name}`);
    };

    // Save metadata
    if (state.currentSession) {
      state.currentSession.videoMeta = {
        name: file.name,
        size: file.size,
        type: file.type,
      };
      saveCurrentSession();
    }
  }

  el.videoFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleVideoFile(e.target.files[0]);
    }
  });

  el.btnChangeVideo.addEventListener('click', () => {
    el.videoFileInput.click();
  });

  // Drag and Drop
  ['dragenter', 'dragover'].forEach((eventName) => {
    el.videoViewport.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.videoEmptyState.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    el.videoViewport.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.videoEmptyState.classList.remove('drag-over');
    });
  });

  el.videoViewport.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) {
      handleVideoFile(dt.files[0]);
    }
  });

  // Video Playback Controls
  function togglePlayPause() {
    if (!el.mainVideo.src) {
      showToast('먼저 연습 영상을 불러와주세요.');
      return;
    }
    if (el.mainVideo.paused) {
      el.mainVideo.play();
    } else {
      el.mainVideo.pause();
    }
  }

  el.btnPlayPause.addEventListener('click', togglePlayPause);

  el.mainVideo.addEventListener('play', () => {
    state.isPlaying = true;
    el.playIcon.style.display = 'none';
    el.pauseIcon.style.display = 'block';
    el.playText.textContent = '일시정지';
  });

  el.mainVideo.addEventListener('pause', () => {
    state.isPlaying = false;
    el.playIcon.style.display = 'block';
    el.pauseIcon.style.display = 'none';
    el.playText.textContent = '재생';
  });

  // Step Controls
  function stepVideo(deltaSec) {
    if (!el.mainVideo.src) return;
    el.mainVideo.pause();
    el.mainVideo.currentTime = Math.max(0, Math.min(el.mainVideo.duration || 0, el.mainVideo.currentTime + deltaSec));
  }

  el.btnStepBackSec.addEventListener('click', () => stepVideo(-1.0));
  el.btnStepBackFrame.addEventListener('click', () => stepVideo(-0.1));
  el.btnStepFwdFrame.addEventListener('click', () => stepVideo(0.1));
  el.btnStepFwdSec.addEventListener('click', () => stepVideo(1.0));

  // Mirror Mode (Belly dance requirement)
  el.btnToggleMirror.addEventListener('click', () => {
    state.isMirrored = !state.isMirrored;
    if (state.isMirrored) {
      el.mainVideo.classList.add('mirrored');
      el.btnToggleMirror.classList.add('active');
    } else {
      el.mainVideo.classList.remove('mirrored');
      el.btnToggleMirror.classList.remove('active');
    }
  });

  // Playback Speed
  el.speedGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-speed]');
    if (!btn) return;
    const speed = parseFloat(btn.dataset.speed);
    state.playbackRate = speed;
    el.mainVideo.playbackRate = speed;

    el.speedGroup.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });

  // A-B Repeat Loop
  function updateAbDisplay() {
    if (state.abRepeat.a !== null || state.abRepeat.b !== null) {
      const aText = state.abRepeat.a !== null ? formatTime(state.abRepeat.a) : '--:--.-';
      const bText = state.abRepeat.b !== null ? formatTime(state.abRepeat.b) : '--:--.-';
      el.abDisplay.textContent = `[${aText} ~ ${bText}]`;
    } else {
      el.abDisplay.textContent = '';
    }

    // Range highlight on scrub bar
    if (state.abRepeat.a !== null && state.abRepeat.b !== null && el.mainVideo.duration) {
      const dur = el.mainVideo.duration;
      const left = (state.abRepeat.a / dur) * 100;
      const width = ((state.abRepeat.b - state.abRepeat.a) / dur) * 100;
      el.scrubAbRange.style.display = 'block';
      el.scrubAbRange.style.left = `${left}%`;
      el.scrubAbRange.style.width = `${width}%`;
    } else {
      el.scrubAbRange.style.display = 'none';
    }
  }

  el.btnSetA.addEventListener('click', () => {
    if (!el.mainVideo.src) return;
    state.abRepeat.a = el.mainVideo.currentTime;
    if (state.abRepeat.b !== null && state.abRepeat.b <= state.abRepeat.a) {
      state.abRepeat.b = null;
    }
    updateAbDisplay();
    showToast(`반복 시작점 A 설정: ${formatTime(state.abRepeat.a)}`);
  });

  el.btnSetB.addEventListener('click', () => {
    if (!el.mainVideo.src) return;
    const cur = el.mainVideo.currentTime;
    if (state.abRepeat.a === null) {
      state.abRepeat.a = 0;
    }
    if (cur <= state.abRepeat.a) {
      showToast('종료점 B는 시작점 A보다 뒤쪽이어야 합니다.');
      return;
    }
    state.abRepeat.b = cur;
    state.abRepeat.enabled = true;
    el.btnToggleLoop.classList.add('active');
    el.btnToggleLoop.textContent = '반복 끄기';
    updateAbDisplay();
    showToast(`반복 종료점 B 설정: ${formatTime(state.abRepeat.b)} (구간 반복 켜짐)`);
  });

  el.btnToggleLoop.addEventListener('click', () => {
    if (state.abRepeat.a === null || state.abRepeat.b === null) {
      showToast('먼저 A 지점과 B 지점을 설정해주세요.');
      return;
    }
    state.abRepeat.enabled = !state.abRepeat.enabled;
    if (state.abRepeat.enabled) {
      el.btnToggleLoop.classList.add('active');
      el.btnToggleLoop.textContent = '반복 끄기';
      el.mainVideo.currentTime = state.abRepeat.a;
      el.mainVideo.play();
    } else {
      el.btnToggleLoop.classList.remove('active');
      el.btnToggleLoop.textContent = '반복 켜기';
    }
  });

  el.btnClearAB.addEventListener('click', () => {
    state.abRepeat.a = null;
    state.abRepeat.b = null;
    state.abRepeat.enabled = false;
    el.btnToggleLoop.classList.remove('active');
    el.btnToggleLoop.textContent = '반복 켜기';
    updateAbDisplay();
    showToast('구간 반복 설정이 초기화되었습니다.');
  });

  // Timeupdate & Scrubbing
  el.mainVideo.addEventListener('timeupdate', () => {
    const cur = el.mainVideo.currentTime;
    const dur = el.mainVideo.duration || 0;

    el.timeCurrent.textContent = formatTime(cur);

    if (dur > 0) {
      const progressPercent = (cur / dur) * 100;
      el.scrubProgress.style.width = `${progressPercent}%`;
    }

    // A-B Repeat check
    if (state.abRepeat.enabled && state.abRepeat.a !== null && state.abRepeat.b !== null) {
      if (cur >= state.abRepeat.b || cur < state.abRepeat.a) {
        el.mainVideo.currentTime = state.abRepeat.a;
      }
    }

    // Highlight active feedback card in list
    highlightActiveFeedbackAtTime(cur);
  });

  // Scrubber Seek
  el.scrubContainer.addEventListener('click', (e) => {
    if (!el.mainVideo.duration) return;
    const rect = el.scrubTrack.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.mainVideo.currentTime = pos * el.mainVideo.duration;
  });

  el.scrubContainer.addEventListener('mousemove', (e) => {
    if (!el.mainVideo.duration) return;
    const rect = el.scrubTrack.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const hoverSeconds = pos * el.mainVideo.duration;
    el.scrubHoverTime.textContent = formatTime(hoverSeconds);
    el.scrubHoverTime.style.left = `${pos * 100}%`;
  });

  // Capture Frame to Canvas
  function captureCurrentFrame() {
    const video = el.mainVideo;
    const canvas = el.snapshotCanvas;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');

    if (state.isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.85);
  }

  // Create / Edit Feedback Modal
  function openFeedbackModal(feedbackToEdit = null) {
    if (!el.mainVideo.src) {
      showToast('먼저 연습 영상을 불러와주세요.');
      return;
    }

    el.mainVideo.pause();

    if (feedbackToEdit) {
      // Editing existing feedback
      state.editingFeedbackId = feedbackToEdit.id;
      state.capturedTimestamp = feedbackToEdit.timestamp;
      state.capturedThumbnail = feedbackToEdit.thumbnail;

      el.feedbackModalTitle.textContent = '피드백 수정';
      el.modalPreviewThumb.src = feedbackToEdit.thumbnail;
      el.modalPreviewTimestamp.textContent = formatTime(feedbackToEdit.timestamp);
      el.inputFeedbackIssue.value = feedbackToEdit.issue || '';
      el.inputFeedbackSolution.value = feedbackToEdit.solution || '';
      el.inputFeedbackResolved.checked = !!feedbackToEdit.isResolved;

      // Select category chip
      selectCategoryChip(feedbackToEdit.category || '골반/힙');
    } else {
      // Adding new feedback at current time
      state.editingFeedbackId = null;
      state.capturedTimestamp = el.mainVideo.currentTime;
      state.capturedThumbnail = captureCurrentFrame();

      el.feedbackModalTitle.textContent = '동작 교정 피드백 작성';
      el.modalPreviewThumb.src = state.capturedThumbnail;
      el.modalPreviewTimestamp.textContent = formatTime(state.capturedTimestamp);
      el.inputFeedbackIssue.value = '';
      el.inputFeedbackSolution.value = '';
      el.inputFeedbackResolved.checked = false;

      selectCategoryChip('골반/힙');
    }

    el.feedbackModal.classList.add('open');
    setTimeout(() => el.inputFeedbackIssue.focus(), 100);
  }

  function closeFeedbackModal() {
    el.feedbackModal.classList.remove('open');
    state.editingFeedbackId = null;
  }

  function selectCategoryChip(catName) {
    el.modalCategoryChips.querySelectorAll('.chip-btn').forEach((btn) => {
      if (btn.dataset.cat === catName) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  el.modalCategoryChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip-btn');
    if (!chip) return;
    el.modalCategoryChips.querySelectorAll('.chip-btn').forEach((c) => c.classList.remove('selected'));
    chip.classList.add('selected');
  });

  el.btnMarkFeedback.addEventListener('click', () => openFeedbackModal());
  el.btnCloseFeedbackModal.addEventListener('click', closeFeedbackModal);
  el.btnCancelFeedback.addEventListener('click', closeFeedbackModal);

  // Save Feedback Note
  el.btnSaveFeedback.addEventListener('click', async () => {
    const issueText = el.inputFeedbackIssue.value.trim();
    if (!issueText) {
      showToast('교정할 부분(문제 동작)을 입력해주세요.');
      el.inputFeedbackIssue.focus();
      return;
    }

    const selectedChip = el.modalCategoryChips.querySelector('.chip-btn.selected');
    const category = selectedChip ? selectedChip.dataset.cat : '기타';
    const solutionText = el.inputFeedbackSolution.value.trim();
    const isResolved = el.inputFeedbackResolved.checked;

    const feedbackObj = {
      id: state.editingFeedbackId || 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      sessionId: state.currentSession.id,
      timestamp: state.capturedTimestamp,
      timestampFormatted: formatTime(state.capturedTimestamp),
      thumbnail: state.capturedThumbnail,
      category,
      issue: issueText,
      solution: solutionText,
      isResolved,
    };

    try {
      await DB.saveFeedback(feedbackObj);
      closeFeedbackModal();
      await loadFeedbacks();
      showToast(state.editingFeedbackId ? '피드백이 수정되었습니다.' : '피드백이 등록되었습니다.');
    } catch (err) {
      console.error('Failed to save feedback:', err);
      showToast('피드백 저장에 실패했습니다.');
    }
  });

  // Load and Render Feedbacks
  async function loadFeedbacks() {
    if (!state.currentSession) return;
    try {
      state.feedbacks = await DB.getFeedbacks(state.currentSession.id);
      renderFeedbackList();
      renderScrubberMarkers();
      updateCounts();
    } catch (err) {
      console.error('Failed to load feedbacks:', err);
    }
  }

  function updateCounts() {
    const total = state.feedbacks.length;
    const resolved = state.feedbacks.filter((f) => f.isResolved).length;
    const pending = total - resolved;

    el.countTotal.textContent = total;
    el.countPending.textContent = pending;
    el.countResolved.textContent = resolved;
  }

  function renderScrubberMarkers() {
    el.scrubMarkers.innerHTML = '';
    const dur = el.mainVideo.duration;
    if (!dur || dur <= 0) return;

    state.feedbacks.forEach((fb) => {
      const pin = document.createElement('div');
      pin.className = 'scrub-marker-pin' + (fb.isResolved ? ' resolved' : '');
      const pct = (fb.timestamp / dur) * 100;
      pin.style.left = `${pct}%`;

      pin.innerHTML = `
        <div class="scrub-tooltip">
          ${fb.timestampFormatted} [${escapeHtml(fb.category)}] ${escapeHtml(fb.issue.substring(0, 16))}...
        </div>
      `;

      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        seekToTimestamp(fb.timestamp);
        highlightCard(fb.id);
      });

      el.scrubMarkers.appendChild(pin);
    });
  }

  function seekToTimestamp(timestamp) {
    if (!el.mainVideo.src) return;
    el.mainVideo.currentTime = timestamp;
    el.mainVideo.pause();
  }

  function playSegmentAround(timestamp) {
    if (!el.mainVideo.src) return;
    clearTimeout(state.segmentPlayTimer);
    const start = Math.max(0, timestamp - 1.2);
    const end = timestamp + 1.8;

    el.mainVideo.currentTime = start;
    el.mainVideo.play();

    const durationMs = (end - start) * 1000 / state.playbackRate;
    state.segmentPlayTimer = setTimeout(() => {
      el.mainVideo.pause();
      el.mainVideo.currentTime = timestamp;
    }, durationMs);
  }

  function renderFeedbackList() {
    el.feedbackListContainer.innerHTML = '';

    const filtered = state.feedbacks.filter((fb) => {
      // Status filter
      if (state.activeFilter === 'pending' && fb.isResolved) return false;
      if (state.activeFilter === 'resolved' && !fb.isResolved) return false;

      // Category filter
      if (state.activeCategory !== 'all' && fb.category !== state.activeCategory) return false;

      return true;
    });

    if (filtered.length === 0) {
      el.feedbackListContainer.innerHTML = `
        <div class="feedback-empty">
          <svg style="width:36px;height:36px;stroke:#94a3b8;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div class="feedback-empty-title">등록된 피드백이 없습니다</div>
          <div class="feedback-empty-desc">영상을 재생하다가 교정하고 싶은 순간에 멈추고 [현재 시점 피드백 작성] 버튼이나 단축키 M을 누르세요.</div>
        </div>
      `;
      return;
    }

    filtered.forEach((fb) => {
      const card = document.createElement('div');
      card.className = `feedback-card ${fb.isResolved ? 'resolved' : ''}`;
      card.id = `fb-card-${fb.id}`;

      card.innerHTML = `
        <div class="feedback-card-top">
          <div class="card-time-group">
            <button class="timestamp-badge-btn" title="이 시점으로 이동">
              <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>${fb.timestampFormatted}</span>
            </button>
            <span class="category-badge" data-cat="${escapeHtml(fb.category)}">${escapeHtml(fb.category)}</span>
          </div>

          <div class="card-actions">
            <button class="btn btn-outline btn-sm btn-play-segment" title="이 구간 전후 3초 재생">구간 확인</button>
            <button class="btn btn-outline btn-sm btn-icon btn-edit-fb" title="수정">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button class="btn btn-outline btn-sm btn-icon btn-delete-fb" title="삭제">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>

        <div class="feedback-card-body">
          <img class="feedback-thumb" src="${fb.thumbnail}" alt="동작 프레임" title="클릭하여 해당 시점으로 이동">
          <div class="feedback-text-content">
            <div class="issue-block">
              <span class="issue-label">교정점</span>${escapeHtml(fb.issue)}
            </div>
            ${
              fb.solution
                ? `<div class="solution-block"><span class="solution-label">체크포인트</span>${escapeHtml(fb.solution)}</div>`
                : ''
            }
          </div>
        </div>

        <div class="feedback-card-bottom">
          <label class="status-toggle-label">
            <input type="checkbox" class="cb-resolve" ${fb.isResolved ? 'checked' : ''}>
            <span>${fb.isResolved ? '수정 완료됨' : '보완 필요'}</span>
          </label>

          <span class="status-badge ${fb.isResolved ? 'done' : 'pending'}">
            ${fb.isResolved ? '완료' : '개선 과제'}
          </span>
        </div>
      `;

      // Event Listeners for Card
      card.querySelector('.timestamp-badge-btn').addEventListener('click', () => {
        seekToTimestamp(fb.timestamp);
        highlightCard(fb.id);
      });

      card.querySelector('.feedback-thumb').addEventListener('click', () => {
        seekToTimestamp(fb.timestamp);
        highlightCard(fb.id);
      });

      card.querySelector('.btn-play-segment').addEventListener('click', () => {
        playSegmentAround(fb.timestamp);
        highlightCard(fb.id);
      });

      card.querySelector('.btn-edit-fb').addEventListener('click', () => {
        openFeedbackModal(fb);
      });

      card.querySelector('.btn-delete-fb').addEventListener('click', async () => {
        if (confirm(`${fb.timestampFormatted} 피드백을 삭제하시겠습니까?`)) {
          await DB.deleteFeedback(fb.id);
          await loadFeedbacks();
          showToast('피드백이 삭제되었습니다.');
        }
      });

      card.querySelector('.cb-resolve').addEventListener('change', async (e) => {
        fb.isResolved = e.target.checked;
        await DB.saveFeedback(fb);
        await loadFeedbacks();
        showToast(fb.isResolved ? '개선 완료 상태로 변경되었습니다.' : '보완 필요 상태로 변경되었습니다.');
      });

      el.feedbackListContainer.appendChild(card);
    });
  }

  function highlightCard(fbId) {
    document.querySelectorAll('.feedback-card').forEach((c) => c.classList.remove('is-active'));
    const target = document.getElementById(`fb-card-${fbId}`);
    if (target) {
      target.classList.add('is-active');
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function highlightActiveFeedbackAtTime(currentTime) {
    if (!state.feedbacks.length) return;
    // Find closest feedback within 1.0 second
    let closest = null;
    let minDiff = 1.0;

    state.feedbacks.forEach((fb) => {
      const diff = Math.abs(fb.timestamp - currentTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = fb;
      }
    });

    document.querySelectorAll('.feedback-card').forEach((c) => c.classList.remove('is-active'));
    if (closest) {
      const card = document.getElementById(`fb-card-${closest.id}`);
      if (card) card.classList.add('is-active');
    }
  }

  // Filter Bar Handlers
  el.statusFilterTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    el.statusFilterTabs.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    state.activeFilter = tab.dataset.filter;
    renderFeedbackList();
  });

  el.selectCategoryFilter.addEventListener('change', (e) => {
    state.activeCategory = e.target.value;
    renderFeedbackList();
  });

  // Drawer & Session History
  async function openSessionDrawer() {
    el.sessionDrawer.classList.add('open');
    renderSessionList();
  }

  function closeSessionDrawer() {
    el.sessionDrawer.classList.remove('open');
  }

  async function renderSessionList() {
    el.sessionListContainer.innerHTML = '';
    const sessions = await DB.getAllSessions();
    updateSessionBadge(sessions.length);

    if (sessions.length === 0) {
      el.sessionListContainer.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:2rem;">저장된 연습일지가 없습니다.</div>';
      return;
    }

    sessions.forEach((s) => {
      const isCurrent = state.currentSession && state.currentSession.id === s.id;
      const card = document.createElement('div');
      card.className = `session-item-card ${isCurrent ? 'current' : ''}`;

      card.innerHTML = `
        <div class="session-item-date">${s.date || ''} · ${s.category || '베이직'}</div>
        <div class="session-item-title">${escapeHtml(s.title || '무제 일지')}</div>
        <div class="session-item-meta">
          <span>${s.videoMeta ? escapeHtml(s.videoMeta.name) : '영상 미지정'}</span>
          <button class="btn btn-outline btn-sm btn-del-session" style="padding:0.15rem 0.4rem;font-size:0.72rem;">삭제</button>
        </div>
      `;

      card.addEventListener('click', async (e) => {
        if (e.target.closest('.btn-del-session')) return;
        state.currentSession = s;
        applySessionToUI();
        await loadFeedbacks();
        closeSessionDrawer();
        showToast(`일지 전환: ${s.title}`);
      });

      card.querySelector('.btn-del-session').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`'${s.title}' 일지와 해당 피드백을 모두 삭제하시겠습니까?`)) {
          await DB.deleteSession(s.id);
          if (state.currentSession && state.currentSession.id === s.id) {
            await loadInitialSession();
          } else {
            renderSessionList();
          }
          showToast('연습일지가 삭제되었습니다.');
        }
      });

      el.sessionListContainer.appendChild(card);
    });
  }

  el.btnOpenHistory.addEventListener('click', openSessionDrawer);
  el.btnCloseDrawer.addEventListener('click', closeSessionDrawer);
  el.sessionDrawer.addEventListener('click', (e) => {
    if (e.target === el.sessionDrawer) closeSessionDrawer();
  });

  async function handleCreateNewSession() {
    const newSession = createBlankSession();
    await DB.saveSession(newSession);
    state.currentSession = newSession;
    applySessionToUI();
    await loadFeedbacks();
    closeSessionDrawer();
    showToast('새 연습일지가 생성되었습니다.');
  }

  el.btnNewSession.addEventListener('click', handleCreateNewSession);
  el.btnDrawerNewSession.addEventListener('click', handleCreateNewSession);

  // Export Text Summary (Clipboard)
  el.btnExportText.addEventListener('click', () => {
    if (!state.currentSession) return;
    const lines = [];
    lines.push(`[벨리댄스 연습일지] ${state.currentSession.title}`);
    lines.push(`일자: ${state.currentSession.date} | 구분: ${state.currentSession.category}`);
    if (state.currentSession.focusAreas && state.currentSession.focusAreas.length > 0) {
      lines.push(`집중 키포인트: ${state.currentSession.focusAreas.join(', ')}`);
    }
    lines.push('');
    lines.push('--- 타임스탬프 동작 피드백 목록 ---');

    if (state.feedbacks.length === 0) {
      lines.push('(등록된 피드백 없음)');
    } else {
      state.feedbacks.forEach((fb, idx) => {
        const status = fb.isResolved ? '[완료]' : '[보완]';
        lines.push(`${idx + 1}. ${status} [${fb.timestampFormatted}] [${fb.category}]`);
        lines.push(`   - 교정점: ${fb.issue}`);
        if (fb.solution) {
          lines.push(`   - 체크포인트: ${fb.solution}`);
        }
      });
    }

    if (state.currentSession.summary) {
      lines.push('');
      lines.push('--- 오늘의 총평 및 과제 ---');
      lines.push(state.currentSession.summary);
    }

    const fullText = lines.join('\n');
    navigator.clipboard.writeText(fullText).then(
      () => showToast('연습일지 요약 텍스트가 클립보드에 복사되었습니다.'),
      () => {
        // Fallback prompt
        prompt('복사할 연습일지 텍스트입니다:', fullText);
      }
    );
  });

  // Print Report
  el.btnPrintReport.addEventListener('click', () => {
    window.print();
  });

  // Backup & Restore Modal
  el.btnBackupRestore.addEventListener('click', () => {
    el.backupModal.classList.add('open');
  });

  function closeBackupModal() {
    el.backupModal.classList.remove('open');
  }

  el.btnCloseBackupModal.addEventListener('click', closeBackupModal);
  el.btnDismissBackup.addEventListener('click', closeBackupModal);

  el.btnDownloadBackup.addEventListener('click', async () => {
    try {
      const data = await DB.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bellydance_practice_backup_${getTodayString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('백업 파일이 다운로드되었습니다.');
    } catch (err) {
      console.error('Backup error:', err);
      showToast('백업 생성 실패');
    }
  });

  el.inputRestoreFile.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await DB.importData(json);
      closeBackupModal();
      await loadInitialSession();
      showToast('백업 데이터 복원이 완료되었습니다.');
    } catch (err) {
      console.error('Restore error:', err);
      showToast('복원 실패: 올바른 백업 JSON 파일이 아닙니다.');
    }
    el.inputRestoreFile.value = '';
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // If typing in input or textarea, ignore shortcuts
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
      if (e.key === 'Escape') {
        document.activeElement.blur();
        closeFeedbackModal();
        closeSessionDrawer();
        closeBackupModal();
      }
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === 'm' || e.key === 'M' || e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      openFeedbackModal();
    } else if (e.key === '[') {
      e.preventDefault();
      stepVideo(-0.1);
    } else if (e.key === ']') {
      e.preventDefault();
      stepVideo(0.1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepVideo(-1.0);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepVideo(1.0);
    } else if (e.key === 'Escape') {
      closeFeedbackModal();
      closeSessionDrawer();
      closeBackupModal();
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialize
  loadInitialSession();
})();
