// =========================================================
// ISLAMABAD EVENT PORTAL - MAIN UI CONTROLLER
// Handles UI state, live opportunity board filters, image uploads, and Supabase Auth
// =========================================================

import { supabaseService } from './supabase.js';

// STATE STORAGE
const state = {
  allEvents: [],
  filteredEvents: [],
  savedEventIds: JSON.parse(localStorage.getItem('isb_saved_events') || '[]'),
  currentUser: JSON.parse(localStorage.getItem('isb_current_user') || 'null'),
  currentTab: 'events', // 'events', 'handlers', 'saved'
  activeFilters: {
    search: '',
    category: 'all',
    sector: 'all',
    format: 'all',
    sort: 'deadline'
  },
  currentDetailEvent: null,
  bannerMode: 'upload', // 'upload', 'presets', 'url'
  uploadedBannerData: ''
};

function parsePrizePool(prizeStr) {
  if (!prizeStr || typeof prizeStr !== 'string') return 0;
  const str = prizeStr.toLowerCase();
  const match = str.match(/(\d[\d,.]*)\s*(k|m|lakh)?/i);
  if (!match) return 0;

  let val = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(val)) return 0;

  const multiplier = match[2] ? match[2].toLowerCase() : '';
  if (multiplier === 'k') val *= 1000;
  else if (multiplier === 'm') val *= 1000000;
  else if (multiplier === 'lakh') val *= 100000;

  return val;
}

function formatPrizeTotal(total) {
  if (total >= 1000000) {
    return `PKR ${(total / 1000000).toFixed(1).replace('.0', '')}M+`;
  } else if (total >= 1000) {
    return `PKR ${Math.round(total / 1000)}K+`;
  } else if (total > 0) {
    return `PKR ${total.toLocaleString()}`;
  }
  return 'PKR 0';
}

// DOM ELEMENTS CACHE
const elements = {
  // Navigation & User
  navEventsBtn: document.getElementById('navEventsBtn'),
  navCalendarBtn: document.getElementById('navCalendarBtn'),
  navHandlersBtn: document.getElementById('navHandlersBtn'),
  navAdminBtn: document.getElementById('navAdminBtn'),
  navSavedBtn: document.getElementById('navSavedBtn'),
  calendarSection: document.getElementById('calendarSection'),
  adminSection: document.getElementById('adminSection'),
  calPrevMonthBtn: document.getElementById('calPrevMonthBtn'),
  calNextMonthBtn: document.getElementById('calNextMonthBtn'),
  calTodayBtn: document.getElementById('calTodayBtn'),
  calCurrentMonthLabel: document.getElementById('calCurrentMonthLabel'),
  calendarDaysGrid: document.getElementById('calendarDaysGrid'),
  adminEventsTableBody: document.getElementById('adminEventsTableBody'),
  adminSearchInput: document.getElementById('adminSearchInput'),
  savedCountBadge: document.getElementById('savedCountBadge'),
  userAuthSection: document.getElementById('userAuthSection'),
  openAuthBtn: document.getElementById('openAuthBtn'),
  openPostEventBtn: document.getElementById('openPostEventBtn'),
  brandHome: document.getElementById('brandHome'),

  // Board & Filters
  boardTitleText: document.getElementById('boardTitleText'),
  eventCountNum: document.getElementById('eventCountNum'),
  statTotalEvents: document.getElementById('statTotalEvents'),
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  sectorFilter: document.getElementById('sectorFilter'),
  formatFilter: document.getElementById('formatFilter'),
  sortFilter: document.getElementById('sortFilter'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  clearFiltersBtn: document.getElementById('clearFiltersBtn'),
  activeTagsRow: document.getElementById('activeTagsRow'),
  activeTagsContainer: document.getElementById('activeTagsContainer'),
  eventsGrid: document.getElementById('eventsGrid'),
  emptyState: document.getElementById('emptyState'),

  // Detail Modal
  eventDetailModal: document.getElementById('eventDetailModal'),
  closeDetailModalBtn: document.getElementById('closeDetailModalBtn'),
  detailBanner: document.getElementById('detailBanner'),
  detailCategory: document.getElementById('detailCategory'),
  detailOfficial: document.getElementById('detailOfficial'),
  detailOrganizer: document.getElementById('detailOrganizer'),
  detailTitle: document.getElementById('detailTitle'),
  detailDates: document.getElementById('detailDates'),
  detailDeadline: document.getElementById('detailDeadline'),
  detailSector: document.getElementById('detailSector'),
  detailPrize: document.getElementById('detailPrize'),
  detailDescription: document.getElementById('detailDescription'),
  detailAgendaBox: document.getElementById('detailAgendaBox'),
  detailAgendaText: document.getElementById('detailAgendaText'),
  detailBookmarkBtn: document.getElementById('detailBookmarkBtn'),
  detailBookmarkIcon: document.getElementById('detailBookmarkIcon'),
  detailShareBtn: document.getElementById('detailShareBtn'),
  detailRegisterLink: document.getElementById('detailRegisterLink'),
  rsvpForm: document.getElementById('rsvpForm'),

  // Post Event Modal & Image Upload UI
  postEventModal: document.getElementById('postEventModal'),
  closePostModalBtn: document.getElementById('closePostModalBtn'),
  cancelPostBtn: document.getElementById('cancelPostBtn'),
  postEventForm: document.getElementById('postEventForm'),
  postModalTitle: document.getElementById('postModalTitle'),
  editEventId: document.getElementById('editEventId'),
  postTitle: document.getElementById('postTitle'),
  postCategory: document.getElementById('postCategory'),
  postCustomCategory: document.getElementById('postCustomCategory'),
  customCategoryGroup: document.getElementById('customCategoryGroup'),
  postFormat: document.getElementById('postFormat'),
  postSector: document.getElementById('postSector'),
  postOrganizer: document.getElementById('postOrganizer'),
  postStartDate: document.getElementById('postStartDate'),
  postDeadline: document.getElementById('postDeadline'),
  postPrize: document.getElementById('postPrize'),
  postRegisterUrl: document.getElementById('postRegisterUrl'),
  
  // Image Modes
  modeUploadBtn: document.getElementById('modeUploadBtn'),
  modeUrlBtn: document.getElementById('modeUrlBtn'),
  uploadGroup: document.getElementById('uploadGroup'),
  customUrlGroup: document.getElementById('customUrlGroup'),
  dropzoneBox: document.getElementById('dropzoneBox'),
  postImageFile: document.getElementById('postImageFile'),
  imagePreviewContainer: document.getElementById('imagePreviewContainer'),
  imagePreview: document.getElementById('imagePreview'),
  previewFilename: document.getElementById('previewFilename'),
  removeImageBtn: document.getElementById('removeImageBtn'),
  postCustomBanner: document.getElementById('postCustomBanner'),
  postDescription: document.getElementById('postDescription'),
  postAgenda: document.getElementById('postAgenda'),

  // Auth Modal
  authModal: document.getElementById('authModal'),
  closeAuthModalBtn: document.getElementById('closeAuthModalBtn'),
  tabSignin: document.getElementById('tabSignin'),
  tabSignup: document.getElementById('tabSignup'),
  authForm: document.getElementById('authForm'),
  nameGroup: document.getElementById('nameGroup'),
  authName: document.getElementById('authName'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authSubmitBtn: document.getElementById('authSubmitBtn'),

  // Toast
  toastContainer: document.getElementById('toastContainer')
};

// INITIALIZATION
async function initApp() {
  initIcons();
  setupEventListeners();
  setupImageUploadEvents();
  setupCalendarControls();
  
  // Sync live Supabase Auth session if available
  try {
    const liveUser = await supabaseService.getCurrentUser();
    if (liveUser) {
      state.currentUser = liveUser;
      localStorage.setItem('isb_current_user', JSON.stringify(liveUser));
    }
  } catch (err) {
    console.warn("Session check exception:", err);
  }
  
  updateSavedBadges();
  updateUserUI();
  
  loadEvents().catch(err => {
    console.error("Non-blocking loadEvents catch:", err);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// FETCH & RENDER EVENTS
async function loadEvents() {
  try {
    state.allEvents = await supabaseService.fetchEvents();
  } catch (e) {
    console.warn("fetchEvents fallback triggered:", e);
    state.allEvents = [];
  }
  applyFilters();
  renderCalendar();
}

function applyFilters() {
  let result = [...state.allEvents];

  // 1. Tab Filter
  if (state.currentTab === 'saved') {
    result = result.filter(evt => state.savedEventIds.includes(evt.id));
  } else if (state.currentTab === 'handlers') {
    if (state.currentUser) {
      result = result.filter(evt => 
        evt.organizer_name.toLowerCase().includes(state.currentUser.name?.toLowerCase() || '') ||
        evt.user_id === state.currentUser.email
      );
    } else {
      result = [];
    }
  }

  // 2. Search query filter
  if (state.activeFilters.search.trim()) {
    const q = state.activeFilters.search.toLowerCase();
    result = result.filter(evt =>
      evt.title.toLowerCase().includes(q) ||
      evt.description.toLowerCase().includes(q) ||
      evt.organizer_name.toLowerCase().includes(q) ||
      evt.sector.toLowerCase().includes(q)
    );
  }

  // 3. Category filter
  if (state.activeFilters.category !== 'all') {
    result = result.filter(evt => evt.category === state.activeFilters.category);
  }

  // 4. Sector filter
  if (state.activeFilters.sector !== 'all') {
    const s = state.activeFilters.sector.toLowerCase();
    result = result.filter(evt => evt.sector.toLowerCase().includes(s));
  }

  // 5. Format filter
  if (state.activeFilters.format !== 'all') {
    result = result.filter(evt => evt.format === state.activeFilters.format);
  }

  // 6. Sorting
  result.sort((a, b) => {
    if (state.activeFilters.sort === 'deadline') {
      return new Date(a.deadline) - new Date(b.deadline);
    } else if (state.activeFilters.sort === 'startDate') {
      return new Date(a.start_date) - new Date(b.start_date);
    } else if (state.activeFilters.sort === 'newest') {
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }
    return 0;
  });

  state.filteredEvents = result;
  renderGrid();
  renderActiveTags();
  updateStats();
}

function renderGrid() {
  elements.eventsGrid.innerHTML = '';
  elements.eventCountNum.textContent = state.filteredEvents.length;
  elements.savedCountBadge.textContent = state.savedEventIds.length;

  if (state.filteredEvents.length === 0) {
    elements.emptyState.style.display = 'block';
    return;
  }

  elements.emptyState.style.display = 'none';

  state.filteredEvents.forEach(evt => {
    const isSaved = state.savedEventIds.includes(evt.id);
    const orgName = (evt.organizer_name || '').toLowerCase();
    const currName = (state.currentUser?.name || '').toLowerCase();
    const isAdmin = state.currentUser && state.currentUser.role === 'admin';
    const isOwner = isAdmin || (state.currentUser && (
      (currName && orgName.includes(currName)) ||
      evt.user_id === state.currentUser.email
    ));

    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="card-image-wrap">
        <img src="${evt.banner_url || 'assets/city-event-board.png'}" alt="${evt.title}" class="card-image" onerror="this.src='assets/city-event-board.png'">
        <div class="card-badges-top">
          <span class="category-tag">${evt.category}</span>
          ${evt.is_official ? '<span class="badge-official">OFFICIAL</span>' : ''}
        </div>
        <button class="btn-bookmark ${isSaved ? 'active' : ''}" data-id="${evt.id}" title="${isSaved ? 'Remove Bookmark' : 'Save Event'}">
          <i data-lucide="bookmark" fill="${isSaved ? '#ffffff' : 'none'}"></i>
        </button>
      </div>
      <div class="card-body">
        <div class="card-organizer">${evt.organizer_name}</div>
        <h3 class="card-title">${evt.title}</h3>
        
        <div class="card-info-row">
          <div class="info-item">
            <i data-lucide="calendar"></i>
            <span>${formatDate(evt.start_date)}</span>
          </div>
          <div class="info-item">
            <i data-lucide="map-pin"></i>
            <span>${evt.sector}</span>
          </div>
          <div class="info-item">
            <i data-lucide="globe"></i>
            <span>${evt.format}</span>
          </div>
        </div>

        <div class="card-footer">
          <span class="prize-pill">${formatDisplayPrize(evt.prize_pool || evt.fee)}</span>
          <div class="owner-controls">
            ${isOwner ? `
              <button class="btn-owner edit-btn" data-id="${evt.id}"><i data-lucide="edit-3"></i> Edit</button>
              <button class="btn-owner danger delete-btn" data-id="${evt.id}"><i data-lucide="trash-2"></i></button>
            ` : ''}
            <button class="btn-card-action view-detail-btn" data-id="${evt.id}">
              Details <i data-lucide="arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    elements.eventsGrid.appendChild(card);
  });

  initIcons();
}

function renderActiveTags() {
  const container = elements.activeTagsContainer;
  container.innerHTML = '';
  let count = 0;

  const filters = state.activeFilters;

  if (filters.search) {
    addTag(`Search: "${filters.search}"`, () => {
      filters.search = '';
      elements.searchInput.value = '';
      applyFilters();
    });
    count++;
  }

  if (filters.category !== 'all') {
    addTag(`Category: ${filters.category}`, () => {
      filters.category = 'all';
      elements.categoryFilter.value = 'all';
      applyFilters();
    });
    count++;
  }

  if (filters.sector !== 'all') {
    addTag(`Sector: ${filters.sector}`, () => {
      filters.sector = 'all';
      if (elements.sectorFilter) elements.sectorFilter.value = 'all';
      applyFilters();
    });
    count++;
  }

  if (filters.format !== 'all') {
    addTag(`Format: ${filters.format}`, () => {
      filters.format = 'all';
      elements.formatFilter.value = 'all';
      applyFilters();
    });
    count++;
  }

  elements.activeTagsRow.style.display = count > 0 ? 'flex' : 'none';
}

function addTag(label, onRemove) {
  const tag = document.createElement('div');
  tag.className = 'tag-pill';
  tag.innerHTML = `<span>${label}</span><button><i data-lucide="x"></i></button>`;
  tag.querySelector('button').addEventListener('click', onRemove);
  elements.activeTagsContainer.appendChild(tag);
}

function updateStats() {
  const statTotalEvents = document.getElementById('statTotalEvents');
  const statTotalPrize = document.getElementById('statTotalPrize');
  const statTotalHubs = document.getElementById('statTotalHubs');

  const totalEvents = Array.isArray(state.allEvents) ? state.allEvents.length : 0;
  if (statTotalEvents) {
    statTotalEvents.textContent = `${totalEvents}+`;
  }

  let totalPrize = 0;
  const hubs = new Set();

  if (Array.isArray(state.allEvents)) {
    state.allEvents.forEach(evt => {
      if (!evt) return;

      const pStr = evt.prize_pool || evt.fee || '';
      if (pStr) {
        totalPrize += parsePrizePool(pStr);
      }
      if (evt.sector && typeof evt.sector === 'string' && evt.sector.trim()) {
        hubs.add(evt.sector.trim());
      }
      if (evt.organizer_name && typeof evt.organizer_name === 'string' && evt.organizer_name.trim()) {
        hubs.add(evt.organizer_name.trim());
      }
    });
  }

  if (statTotalPrize) {
    statTotalPrize.textContent = formatPrizeTotal(totalPrize);
  }

  if (statTotalHubs) {
    const hubCount = hubs.size > 0 ? hubs.size : (totalEvents > 0 ? totalEvents : 1);
    statTotalHubs.textContent = `${hubCount}+`;
  }
}

function formatDisplayPrize(val) {
  if (!val) return 'Free';
  const strVal = String(val);
  const numericVal = strVal.replace(/,/g, '');
  if (/^\d+$/.test(numericVal)) {
    return 'PKR ' + parseInt(numericVal, 10).toLocaleString();
  }
  return strVal;
}

function formatDate(dateStr) {
  if (!dateStr) return 'TBA';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// IMAGE UPLOAD HANDLERS
function setupImageUploadEvents() {
  if (elements.modeUploadBtn) elements.modeUploadBtn.addEventListener('click', () => setImageMode('upload'));
  if (elements.modeUrlBtn) elements.modeUrlBtn.addEventListener('click', () => setImageMode('url'));

  if (elements.dropzoneBox && elements.postImageFile) {
    elements.dropzoneBox.addEventListener('click', () => elements.postImageFile.click());
    
    elements.postImageFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleImageFile(file);
    });

    elements.dropzoneBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.dropzoneBox.style.borderColor = '#059669';
    });

    elements.dropzoneBox.addEventListener('dragleave', () => {
      elements.dropzoneBox.style.borderColor = '#cbd5e1';
    });

    elements.dropzoneBox.addEventListener('drop', (e) => {
      e.preventDefault();
      elements.dropzoneBox.style.borderColor = '#cbd5e1';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFile(e.dataTransfer.files[0]);
      }
    });
  }

  if (elements.removeImageBtn) {
    elements.removeImageBtn.addEventListener('click', () => {
      state.uploadedBannerData = '';
      if (elements.postImageFile) elements.postImageFile.value = '';
      if (elements.imagePreviewContainer) elements.imagePreviewContainer.style.display = 'none';
      if (elements.dropzoneBox) elements.dropzoneBox.style.display = 'block';
    });
  }
}

function setImageMode(mode) {
  state.bannerMode = mode;
  if (elements.modeUploadBtn) elements.modeUploadBtn.classList.toggle('active', mode === 'upload');
  if (elements.modeUrlBtn) elements.modeUrlBtn.classList.toggle('active', mode === 'url');

  if (elements.uploadGroup) elements.uploadGroup.style.display = mode === 'upload' ? 'block' : 'none';
  if (elements.customUrlGroup) elements.customUrlGroup.style.display = mode === 'url' ? 'block' : 'none';
}

function handleImageFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    showToast('File size is too large. Please select an image under 5MB.', 'warning');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    state.uploadedBannerData = e.target.result;
    if (elements.imagePreview) elements.imagePreview.src = state.uploadedBannerData;
    if (elements.previewFilename) elements.previewFilename.textContent = file.name;
    if (elements.dropzoneBox) elements.dropzoneBox.style.display = 'none';
    if (elements.imagePreviewContainer) elements.imagePreviewContainer.style.display = 'block';
    showToast('Poster image selected!', 'success');
  };
  reader.readAsDataURL(file);
}

// EVENT LISTENERS
function setupEventListeners() {
  if (elements.brandHome) {
    elements.brandHome.addEventListener('click', () => switchTab('events'));
  }

  // Nav Tabs
  const navEventsBtn = elements.navEventsBtn || document.getElementById('navEventsBtn');
  const navCalendarBtn = elements.navCalendarBtn || document.getElementById('navCalendarBtn');
  const navHandlersBtn = elements.navHandlersBtn || document.getElementById('navHandlersBtn');
  const navAdminBtn = elements.navAdminBtn || document.getElementById('navAdminBtn');
  const navSavedBtn = elements.navSavedBtn || document.getElementById('navSavedBtn');

  if (navEventsBtn) navEventsBtn.addEventListener('click', () => switchTab('events'));
  if (navCalendarBtn) navCalendarBtn.addEventListener('click', () => switchTab('calendar'));
  if (navHandlersBtn) navHandlersBtn.addEventListener('click', () => switchTab('handlers'));
  if (navAdminBtn) navAdminBtn.addEventListener('click', () => switchTab('admin'));
  if (navSavedBtn) navSavedBtn.addEventListener('click', () => switchTab('saved'));

  // Mobile Bottom Nav Items
  const mobileNavEvents = document.getElementById('mobileNavEvents');
  const mobileNavCalendar = document.getElementById('mobileNavCalendar');
  const mobileNavPost = document.getElementById('mobileNavPost');
  const mobileNavSaved = document.getElementById('mobileNavSaved');
  const mobileNavProfile = document.getElementById('mobileNavProfile');

  if (mobileNavEvents) {
    mobileNavEvents.addEventListener('click', () => {
      switchTab('events');
      document.getElementById('eventsBoardView')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
  if (mobileNavCalendar) {
    mobileNavCalendar.addEventListener('click', () => {
      switchTab('calendar');
      document.getElementById('calendarView')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
  if (mobileNavPost) {
    mobileNavPost.addEventListener('click', () => {
      if (!state.currentUser) {
        showToast('Please sign in as an Event Manager to post an event.', 'warning');
        openModal(elements.authModal);
      } else {
        openPostModal();
      }
    });
  }
  if (mobileNavSaved) {
    mobileNavSaved.addEventListener('click', () => {
      switchTab('saved');
      document.getElementById('eventsBoardView')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
  if (mobileNavProfile) {
    mobileNavProfile.addEventListener('click', () => {
      if (!state.currentUser) {
        openModal(elements.authModal);
      } else if (state.currentUser.role === 'admin') {
        switchTab('admin');
      } else {
        switchTab('handlers');
      }
    });
  }

  // Admin Search
  const adminSearch = elements.adminSearchInput || document.getElementById('adminSearchInput');
  if (adminSearch) adminSearch.addEventListener('input', renderAdminDashboard);

  // Admin Table Delegation
  const adminTable = document.getElementById('adminEventsTableBody');
  if (adminTable) {
    adminTable.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.toggle-official-btn');
      if (toggleBtn) {
        handleAdminToggleOfficial(toggleBtn.dataset.id);
        return;
      }
      const editBtn = e.target.closest('.edit-btn');
      if (editBtn) {
        openEditModal(editBtn.dataset.id);
        return;
      }
      const deleteBtn = e.target.closest('.delete-btn');
      if (deleteBtn) {
        handleDeleteEvent(deleteBtn.dataset.id);
        return;
      }
    });
  }

  // Search & Filters
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      state.activeFilters.search = e.target.value;
      applyFilters();
    });
  }

  if (elements.categoryFilter) {
    elements.categoryFilter.addEventListener('change', (e) => {
      state.activeFilters.category = e.target.value;
      applyFilters();
    });
  }

  if (elements.sectorFilter) {
    elements.sectorFilter.addEventListener('change', (e) => {
      state.activeFilters.sector = e.target.value;
      applyFilters();
    });
  }

  if (elements.formatFilter) {
    elements.formatFilter.addEventListener('change', (e) => {
      state.activeFilters.format = e.target.value;
      applyFilters();
    });
  }

  if (elements.sortFilter) {
    elements.sortFilter.addEventListener('change', (e) => {
      state.activeFilters.sort = e.target.value;
      applyFilters();
    });
  }

  if (elements.resetFiltersBtn) elements.resetFiltersBtn.addEventListener('click', resetFilters);
  if (elements.clearFiltersBtn) elements.clearFiltersBtn.addEventListener('click', resetFilters);

  // Cards Grid Clicks (Delegation)
  if (elements.eventsGrid) {
    elements.eventsGrid.addEventListener('click', (e) => {
      const bookmarkBtn = e.target.closest('.btn-bookmark');
      if (bookmarkBtn) {
        const id = bookmarkBtn.dataset.id;
        toggleBookmark(id);
        return;
      }

      const detailBtn = e.target.closest('.view-detail-btn');
      if (detailBtn) {
        const id = detailBtn.dataset.id;
        openDetailModal(id);
        return;
      }

      const editBtn = e.target.closest('.edit-btn');
      if (editBtn) {
        const id = editBtn.dataset.id;
        openEditModal(id);
        return;
      }

      const deleteBtn = e.target.closest('.delete-btn');
      if (deleteBtn) {
        handleDeleteEvent(deleteBtn.dataset.id);
        return;
      }
    });
  }

  // Open Post Event Button
  if (elements.openPostEventBtn) {
    elements.openPostEventBtn.addEventListener('click', () => {
      if (!state.currentUser) {
        showToast('Please sign in as an Event Manager to post an event.', 'warning');
        openModal(elements.authModal);
      } else {
        openPostModal();
      }
    });
  }

  // Post Event Form Submit
  if (elements.postEventForm) elements.postEventForm.addEventListener('submit', handlePostSubmit);
  if (elements.postCategory) {
    elements.postCategory.addEventListener('change', (e) => {
      toggleCustomCategoryField(e.target.value === 'Other');
    });
  }

  // Auth Buttons & Delegation
  if (elements.userAuthSection) {
    elements.userAuthSection.addEventListener('click', (e) => {
      const logoutBtn = e.target.closest('#logoutBtn') || e.target.closest('.btn-logout-icon');
      if (logoutBtn) {
        e.preventDefault();
        e.stopPropagation();
        handleLogout();
        return;
      }
      const openBtn = e.target.closest('#openAuthBtn');
      if (openBtn) {
        e.preventDefault();
        openModal(elements.authModal);
        return;
      }
    });
  }
  if (elements.closeAuthModalBtn) elements.closeAuthModalBtn.addEventListener('click', () => closeModal(elements.authModal));
  if (elements.tabSignin) elements.tabSignin.addEventListener('click', () => setAuthTab('signin'));
  if (elements.tabSignup) elements.tabSignup.addEventListener('click', () => setAuthTab('signup'));
  if (elements.authForm) elements.authForm.addEventListener('submit', handleAuthSubmit);

  // Detail Modal Controls
  if (elements.closeDetailModalBtn) elements.closeDetailModalBtn.addEventListener('click', () => closeModal(elements.eventDetailModal));
  if (elements.detailBookmarkBtn) {
    elements.detailBookmarkBtn.addEventListener('click', () => {
      if (state.currentDetailEvent) {
        toggleBookmark(state.currentDetailEvent.id);
        updateDetailBookmarkBtn();
      }
    });
  }
  if (elements.detailShareBtn) {
    elements.detailShareBtn.addEventListener('click', () => {
      copyTextToClipboard(window.location.href, 'Event link copied to clipboard!');
    });
  }
  if (elements.rsvpForm) {
    elements.rsvpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('RSVP saved! You will receive updates via email.', 'success');
      elements.rsvpForm.reset();
    });
  }

  // Post Event Modal Close
  if (elements.closePostModalBtn) elements.closePostModalBtn.addEventListener('click', () => closeModal(elements.postEventModal));
  if (elements.cancelPostBtn) elements.cancelPostBtn.addEventListener('click', () => closeModal(elements.postEventModal));

  // Close Modals on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Donation FAB
  const donationFab = document.getElementById('donationFab');
  if (donationFab) {
    donationFab.addEventListener('click', () => {
      const supportModal = document.getElementById('supportModal');
      if (supportModal) {
        openModal(supportModal);
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Support Modal logic
  const closeSupportModalBtn = document.getElementById('closeSupportModalBtn');
  if (closeSupportModalBtn) {
    closeSupportModalBtn.addEventListener('click', () => closeModal(document.getElementById('supportModal')));
  }

  const copyEasypaisaBtn = document.getElementById('copyEasypaisaBtn');
  if (copyEasypaisaBtn) {
    copyEasypaisaBtn.addEventListener('click', () => {
      const num = '03165545022';
      copyTextToClipboard(num, `Easypaisa number (${num}) copied to clipboard! Thank you ☕`);
    });
  }

  // Footer Navigation & Actions
  const footerNavEvents = document.getElementById('footerNavEvents');
  if (footerNavEvents) {
    footerNavEvents.addEventListener('click', () => {
      switchTab('events');
      document.getElementById('eventsBoardView')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  const footerNavCalendar = document.getElementById('footerNavCalendar');
  if (footerNavCalendar) {
    footerNavCalendar.addEventListener('click', () => {
      switchTab('calendar');
      document.getElementById('calendarView')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  const footerNavSaved = document.getElementById('footerNavSaved');
  if (footerNavSaved) {
    footerNavSaved.addEventListener('click', () => {
      switchTab('saved');
      document.getElementById('eventsBoardView')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  const footerNavPost = document.getElementById('footerNavPost');
  if (footerNavPost) {
    footerNavPost.addEventListener('click', () => {
      if (!state.currentUser) {
        showToast('Please sign in as an Event Manager to post an event.', 'warning');
        openModal(elements.authModal);
      } else {
        openPostModal();
      }
    });
  }

  const footerSupportBtn = document.getElementById('footerSupportBtn');
  if (footerSupportBtn) {
    footerSupportBtn.addEventListener('click', () => {
      const supportModal = document.getElementById('supportModal');
      if (supportModal) {
        openModal(supportModal);
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  const backToTopBtn = document.getElementById('backToTopBtn');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  document.querySelectorAll('.footer-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      if (cat) {
        state.activeFilters.category = cat;
        if (elements.categoryFilter) elements.categoryFilter.value = cat;
        switchTab('events');
        applyFilters();
        document.getElementById('eventsBoardView')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

function copyTextToClipboard(text, successMsg) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg, 'success');
    }).catch(() => {
      fallbackCopyText(text, successMsg);
    });
  } else {
    fallbackCopyText(text, successMsg);
  }
}

function fallbackCopyText(text, successMsg) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) {
      showToast(successMsg, 'success');
    } else {
      showToast(`Copy: ${text}`, 'info');
    }
  } catch (err) {
    showToast(`Copy: ${text}`, 'info');
  }
}

// TAB SWITCHING
function switchTab(tab) {
  state.currentTab = tab;

  const navEventsBtn = elements.navEventsBtn || document.getElementById('navEventsBtn');
  const navCalendarBtn = elements.navCalendarBtn || document.getElementById('navCalendarBtn');
  const navHandlersBtn = elements.navHandlersBtn || document.getElementById('navHandlersBtn');
  const navAdminBtn = elements.navAdminBtn || document.getElementById('navAdminBtn');
  const navSavedBtn = elements.navSavedBtn || document.getElementById('navSavedBtn');

  const boardSection = document.getElementById('eventsBoardView') || document.querySelector('.board-section');
  const heroSection = document.querySelector('.hero-section');
  const calendarSection = document.getElementById('calendarView') || document.getElementById('calendarSection') || document.querySelector('.calendar-section');
  const adminSection = document.getElementById('adminDashboardView') || document.getElementById('adminSection') || document.querySelector('.admin-section');

  if (navEventsBtn) navEventsBtn.classList.toggle('active', tab === 'events');
  if (navCalendarBtn) navCalendarBtn.classList.toggle('active', tab === 'calendar');
  if (navHandlersBtn) navHandlersBtn.classList.toggle('active', tab === 'handlers');
  if (navAdminBtn) navAdminBtn.classList.toggle('active', tab === 'admin');
  if (navSavedBtn) navSavedBtn.classList.toggle('active', tab === 'saved');

  // Sync Mobile Bottom Navigation active states
  const mobileNavEvents = document.getElementById('mobileNavEvents');
  const mobileNavCalendar = document.getElementById('mobileNavCalendar');
  const mobileNavSaved = document.getElementById('mobileNavSaved');
  const mobileNavProfile = document.getElementById('mobileNavProfile');

  if (mobileNavEvents) mobileNavEvents.classList.toggle('active', tab === 'events');
  if (mobileNavCalendar) mobileNavCalendar.classList.toggle('active', tab === 'calendar');
  if (mobileNavSaved) mobileNavSaved.classList.toggle('active', tab === 'saved');
  if (mobileNavProfile) mobileNavProfile.classList.toggle('active', tab === 'handlers' || tab === 'admin');

  if (tab === 'calendar') {
    if (boardSection) boardSection.style.display = 'none';
    if (heroSection) heroSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
    if (calendarSection) calendarSection.style.display = 'block';
    renderCalendar();
    return;
  } else if (tab === 'admin') {
    if (boardSection) boardSection.style.display = 'none';
    if (heroSection) heroSection.style.display = 'none';
    if (calendarSection) calendarSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'block';
    renderAdminDashboard();
    return;
  } else {
    if (boardSection) boardSection.style.display = 'block';
    if (heroSection) heroSection.style.display = 'block';
    if (calendarSection) calendarSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
  }

  if (tab === 'events') {
    if (elements.boardTitleText) elements.boardTitleText.textContent = 'Find your next city event';
  } else if (tab === 'saved') {
    if (elements.boardTitleText) elements.boardTitleText.textContent = 'Your Saved & Bookmarked Events';
  } else if (tab === 'handlers') {
    if (!state.currentUser) {
      showToast('Please sign in as an Event Manager to access your posted events.', 'warning');
      openModal(elements.authModal);
      return;
    }
    if (elements.boardTitleText) elements.boardTitleText.textContent = `Posted by ${state.currentUser.name || 'You'}`;
  }

  applyFilters();
}

function resetFilters() {
  state.activeFilters = {
    search: '',
    category: 'all',
    sector: 'all',
    format: 'all',
    sort: 'deadline'
  };
  if (elements.searchInput) elements.searchInput.value = '';
  if (elements.categoryFilter) elements.categoryFilter.value = 'all';
  if (elements.sectorFilter) elements.sectorFilter.value = 'all';
  if (elements.formatFilter) elements.formatFilter.value = 'all';
  if (elements.sortFilter) elements.sortFilter.value = 'deadline';
  applyFilters();
}

// BOOKMARKING
function toggleBookmark(id) {
  const index = state.savedEventIds.indexOf(id);
  if (index === -1) {
    state.savedEventIds.push(id);
    showToast('Event saved to your bookmarks!', 'success');
  } else {
    state.savedEventIds.splice(index, 1);
    showToast('Event removed from saved bookmarks.', 'info');
  }
  localStorage.setItem('isb_saved_events', JSON.stringify(state.savedEventIds));
  updateSavedBadges();
  applyFilters();
}

function updateSavedBadges() {
  const count = Array.isArray(state.savedEventIds) ? state.savedEventIds.length : 0;
  const desktopBadge = document.getElementById('savedCountBadge');
  const mobileBadge = document.getElementById('mobileSavedBadge');
  if (desktopBadge) {
    desktopBadge.textContent = count;
    desktopBadge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
  if (mobileBadge) {
    mobileBadge.textContent = count;
    mobileBadge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
}

function updateDetailBookmarkBtn() {
  if (!state.currentDetailEvent) return;
  const isSaved = state.savedEventIds.includes(state.currentDetailEvent.id);
  if (elements.detailBookmarkBtn) elements.detailBookmarkBtn.classList.toggle('active', isSaved);
  if (elements.detailBookmarkIcon) elements.detailBookmarkIcon.setAttribute('fill', isSaved ? '#ffffff' : 'none');
}

// DETAIL MODAL
function openDetailModal(id) {
  const evt = state.allEvents.find(e => e.id === id);
  if (!evt) return;

  state.currentDetailEvent = evt;
  if (elements.detailBanner) elements.detailBanner.src = evt.banner_url || 'assets/city-event-board.png';
  if (elements.detailCategory) elements.detailCategory.textContent = evt.category;
  if (elements.detailOfficial) elements.detailOfficial.style.display = evt.is_official ? 'inline-block' : 'none';
  if (elements.detailOrganizer) elements.detailOrganizer.textContent = evt.organizer_name;
  if (elements.detailTitle) elements.detailTitle.textContent = evt.title;
  if (elements.detailDates) elements.detailDates.textContent = formatDate(evt.start_date);
  if (elements.detailDeadline) elements.detailDeadline.textContent = formatDate(evt.deadline);
  if (elements.detailSector) elements.detailSector.textContent = `${evt.sector} (${evt.format})`;
  if (elements.detailPrize) elements.detailPrize.textContent = formatDisplayPrize(evt.prize_pool || evt.fee);
  if (elements.detailDescription) elements.detailDescription.textContent = evt.description;

  if (evt.agenda) {
    if (elements.detailAgendaBox) elements.detailAgendaBox.style.display = 'block';
    if (elements.detailAgendaText) elements.detailAgendaText.textContent = evt.agenda;
  } else {
    if (elements.detailAgendaBox) elements.detailAgendaBox.style.display = 'none';
  }

  if (elements.detailRegisterLink) elements.detailRegisterLink.href = evt.registration_url || '#';
  updateDetailBookmarkBtn();
  openModal(elements.eventDetailModal);
}

// POST / EDIT MODAL
function toggleCustomCategoryField(isOther) {
  if (elements.customCategoryGroup) {
    elements.customCategoryGroup.style.display = isOther ? 'block' : 'none';
  }
  if (elements.postCustomCategory) {
    elements.postCustomCategory.required = isOther;
    if (!isOther) elements.postCustomCategory.value = '';
  }
}

function openPostModal() {
  if (elements.postModalTitle) elements.postModalTitle.textContent = 'Post New Islamabad Tech Event';
  if (elements.editEventId) elements.editEventId.value = '';
  if (elements.postEventForm) elements.postEventForm.reset();
  toggleCustomCategoryField(false);
  
  state.uploadedBannerData = '';
  if (elements.imagePreviewContainer) elements.imagePreviewContainer.style.display = 'none';
  if (elements.dropzoneBox) elements.dropzoneBox.style.display = 'block';
  setImageMode('upload');

  if (state.currentUser && elements.postOrganizer) {
    elements.postOrganizer.value = state.currentUser.name || '';
  }
  openModal(elements.postEventModal);
}

function openEditModal(id) {
  const evt = state.allEvents.find(e => e.id === id);
  if (!evt) return;

  if (elements.postModalTitle) elements.postModalTitle.textContent = 'Edit Posted Tech Event';
  if (elements.editEventId) elements.editEventId.value = evt.id;
  if (elements.postTitle) elements.postTitle.value = evt.title;

  const standardCategories = ['Coding Competition', 'Hackathon', 'Bootcamp', 'Workshop', 'Career Program'];
  if (elements.postCategory) {
    if (standardCategories.includes(evt.category)) {
      elements.postCategory.value = evt.category;
      toggleCustomCategoryField(false);
    } else {
      elements.postCategory.value = 'Other';
      toggleCustomCategoryField(true);
      if (elements.postCustomCategory) elements.postCustomCategory.value = evt.category;
    }
  }

  if (elements.postFormat) elements.postFormat.value = evt.format;
  if (elements.postSector) elements.postSector.value = evt.sector;
  if (elements.postOrganizer) elements.postOrganizer.value = evt.organizer_name;
  if (elements.postStartDate) elements.postStartDate.value = evt.start_date;
  if (elements.postDeadline) elements.postDeadline.value = evt.deadline;
  if (elements.postPrize) elements.postPrize.value = formatDisplayPrize(evt.prize_pool || evt.fee);
  if (elements.postRegisterUrl) elements.postRegisterUrl.value = evt.registration_url || '';
  if (elements.postDescription) elements.postDescription.value = evt.description;
  if (elements.postAgenda) elements.postAgenda.value = evt.agenda || '';

  if (evt.banner_url && evt.banner_url.startsWith('data:image')) {
    state.uploadedBannerData = evt.banner_url;
    if (elements.imagePreview) elements.imagePreview.src = evt.banner_url;
    if (elements.imagePreviewContainer) elements.imagePreviewContainer.style.display = 'block';
    if (elements.dropzoneBox) elements.dropzoneBox.style.display = 'none';
    setImageMode('upload');
  } else if (evt.banner_url && (evt.banner_url.startsWith('http') || evt.banner_url.startsWith('assets/'))) {
    if (elements.postCustomBanner) elements.postCustomBanner.value = evt.banner_url;
    setImageMode('url');
  } else {
    setImageMode('upload');
  }

  openModal(elements.postEventModal);
}

async function handlePostSubmit(e) {
  e.preventDefault();

  let banner = 'assets/city-event-board.png';

  if (state.bannerMode === 'upload' && state.uploadedBannerData) {
    banner = state.uploadedBannerData;
  } else if (state.bannerMode === 'url' && elements.postCustomBanner && elements.postCustomBanner.value.trim()) {
    banner = elements.postCustomBanner.value.trim();
  }

  let selectedCategory = elements.postCategory ? elements.postCategory.value : 'Hackathon';
  if (selectedCategory === 'Other') {
    const customCat = elements.postCustomCategory ? elements.postCustomCategory.value.trim() : '';
    selectedCategory = customCat || 'Other';
  }

  let rawPrize = (elements.postPrize ? elements.postPrize.value.trim() : '') || 'Free';
  const numericVal = rawPrize.replace(/,/g, '');
  if (/^\d+$/.test(numericVal)) {
    rawPrize = 'PKR ' + parseInt(numericVal, 10).toLocaleString();
  }

  const formData = {
    title: elements.postTitle ? elements.postTitle.value.trim() : '',
    category: selectedCategory,
    format: elements.postFormat ? elements.postFormat.value : 'In-Person',
    sector: elements.postSector ? elements.postSector.value.trim() : 'Islamabad',
    organizer_name: elements.postOrganizer ? elements.postOrganizer.value.trim() : 'Organizer',
    start_date: elements.postStartDate ? elements.postStartDate.value : '',
    deadline: elements.postDeadline ? elements.postDeadline.value : '',
    prize_pool: rawPrize,
    registration_url: elements.postRegisterUrl ? elements.postRegisterUrl.value.trim() : '#',
    banner_url: banner,
    description: elements.postDescription ? elements.postDescription.value.trim() : '',
    agenda: elements.postAgenda ? elements.postAgenda.value.trim() : '',
    user_id: state.currentUser ? state.currentUser.email : 'guest'
  };

  const editId = elements.editEventId ? elements.editEventId.value : '';

  if (editId) {
    await supabaseService.updateEvent(editId, formData);
    showToast('Event updated successfully!', 'success');
  } else {
    await supabaseService.createEvent(formData);
    showToast('New tech event published live with poster!', 'success');
  }

  closeModal(elements.postEventModal);
  await loadEvents();
}

async function handleDeleteEvent(id) {
  if (confirm('Are you sure you want to delete this event posting?')) {
    await supabaseService.deleteEvent(id);
    showToast('Event deleted.', 'info');
    await loadEvents();
  }
}

// SUPABASE AUTHENTICATION HANDLERS
function setAuthTab(mode) {
  if (elements.tabSignin) elements.tabSignin.classList.toggle('active', mode === 'signin');
  if (elements.tabSignup) elements.tabSignup.classList.toggle('active', mode === 'signup');
  if (elements.nameGroup) elements.nameGroup.style.display = mode === 'signup' ? 'block' : 'none';
  if (elements.authSubmitBtn) elements.authSubmitBtn.textContent = mode === 'signup' ? 'Register Account' : 'Sign In as Event Manager';
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = elements.authEmail ? elements.authEmail.value.trim() : '';
  const password = elements.authPassword ? elements.authPassword.value : '';
  const name = (elements.authName ? elements.authName.value.trim() : '') || email.split('@')[0];
  const isSignup = elements.tabSignup && elements.tabSignup.classList.contains('active');

  if (isSignup) {
    const res = await supabaseService.signUpUser(email, password, name);
    if (!res.success) {
      showToast(`Registration Error: ${res.error}`, 'warning');
      return;
    }
    showToast(`Account registered in Supabase Auth! Welcome, ${name}.`, 'success');
    const role = res.data?.app_metadata?.role === 'admin' ? 'admin' : 'manager';
    state.currentUser = {
      id: res.data?.id,
      email,
      name,
      role
    };
  } else {
    const res = await supabaseService.signInUser(email, password);
    if (!res.success) {
      showToast(`Sign In Error: ${res.error}`, 'warning');
      return;
    }
    showToast(`Signed in! Welcome back, ${name}.`, 'success');
    const user = res.data;
    const role = user?.app_metadata?.role === 'admin' ? 'admin' : 'manager';
    const fullName = user?.user_metadata?.full_name || name;
    state.currentUser = {
      id: user?.id,
      email,
      name: fullName,
      role
    };
  }

  localStorage.setItem('isb_current_user', JSON.stringify(state.currentUser));
  updateUserUI();
  closeModal(elements.authModal);

  if (state.currentUser.role === 'admin') {
    switchTab('admin');
  }
}

async function handleLogout() {
  state.currentUser = null;
  localStorage.removeItem('isb_current_user');
  updateUserUI();
  showToast('Logged out successfully.', 'info');
  switchTab('events');
  try {
    await supabaseService.signOutUser();
  } catch (err) {
    console.warn("Background signOut err:", err);
  }
}

function updateUserUI() {
  const navAdminBtn = elements.navAdminBtn || document.getElementById('navAdminBtn');
  const navHandlersBtn = elements.navHandlersBtn || document.getElementById('navHandlersBtn');

  if (state.currentUser) {
    if (navAdminBtn) {
      navAdminBtn.style.display = state.currentUser.role === 'admin' ? 'inline-flex' : 'none';
    }
    if (navHandlersBtn) {
      navHandlersBtn.style.display = 'inline-flex';
    }

    if (elements.userAuthSection) {
      const badgeRole = state.currentUser.role === 'admin' ? 'Admin' : 'Manager';
      const initials = (state.currentUser.name || 'U').substring(0, 2).toUpperCase();

      elements.userAuthSection.innerHTML = `
        <div class="user-profile-badge">
          <div class="user-avatar">${initials}</div>
          <div class="user-info">
            <span class="user-name">${state.currentUser.name}</span>
            <span class="user-role-tag">${badgeRole}</span>
          </div>
          <button id="logoutBtn" class="btn-logout-icon" title="Log Out">
            <i data-lucide="log-out"></i>
          </button>
        </div>
      `;
      initIcons();
    }
  } else {
    if (navAdminBtn) navAdminBtn.style.display = 'none';
    if (navHandlersBtn) navHandlersBtn.style.display = 'none';

    if (elements.userAuthSection) {
      elements.userAuthSection.innerHTML = `
        <button class="btn-secondary" id="openAuthBtn">
          <i data-lucide="user"></i> Sign in
        </button>
      `;
      initIcons();
    }
  }

  const mobileNavProfileText = document.getElementById('mobileNavProfileText');
  if (mobileNavProfileText) {
    mobileNavProfileText.textContent = state.currentUser ? (state.currentUser.name?.split(' ')[0] || 'Account') : 'Sign In';
  }
}

// CALENDAR ENGINE
let currentCalendarDate = new Date(2026, 7, 1); // August 2026

function setupCalendarControls() {
  const calPrevMonthBtn = document.getElementById('calPrevMonthBtn');
  const calNextMonthBtn = document.getElementById('calNextMonthBtn');

  if (calPrevMonthBtn) {
    calPrevMonthBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderCalendar();
    });
  }

  if (calNextMonthBtn) {
    calNextMonthBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderCalendar();
    });
  }
}

function renderCalendar() {
  const grid = document.getElementById('calendarDaysGrid');
  const monthTitle = document.getElementById('calMonthTitle');
  if (!grid) return;

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (monthTitle) {
    monthTitle.textContent = `${monthNames[month]} ${year}`;
  }

  grid.innerHTML = '';

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  // 1. Render previous month padding days
  for (let i = firstDayIndex; i > 0; i--) {
    const dayNum = prevMonthTotalDays - i + 1;
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell cal-day-outside';
    cell.innerHTML = `<span class="cal-day-num">${dayNum}</span>`;
    grid.appendChild(cell);
  }

  // 2. Render current month days
  const today = new Date();
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cell = document.createElement('div');
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    cell.className = `cal-day-cell ${isToday ? 'cal-today' : ''}`;

    const dayEvents = state.allEvents.filter(evt => {
      if (!evt.start_date) return false;
      return evt.start_date === dateStr || evt.start_date.startsWith(dateStr);
    });

    let eventsHtml = '';
    dayEvents.forEach(evt => {
      eventsHtml += `
        <div class="cal-event-pill" data-id="${evt.id}" title="${evt.title} (${evt.sector || 'Islamabad'})">
          <span class="cal-event-dot"></span>
          <span class="cal-event-title">${evt.title}</span>
        </div>
      `;
    });

    cell.innerHTML = `
      <div class="cal-day-header">
        <span class="cal-day-num">${day}</span>
        ${dayEvents.length > 0 ? `<span class="cal-day-count">${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}</span>` : ''}
      </div>
      <div class="cal-day-events">${eventsHtml}</div>
    `;

    grid.appendChild(cell);
  }

  // 3. Render next month padding days
  const totalRendered = firstDayIndex + totalDaysInMonth;
  const remainingCells = 42 - totalRendered;
  for (let i = 1; i <= remainingCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell cal-day-outside';
    cell.innerHTML = `<span class="cal-day-num">${i}</span>`;
    grid.appendChild(cell);
  }

  // Add click listeners to event pills in calendar
  grid.querySelectorAll('.cal-event-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      openDetailModal(pill.dataset.id);
    });
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderAdminDashboard() {
  const tableBody = document.getElementById('adminEventsTableBody');
  const totalEventsEl = document.getElementById('adminTotalEvents');
  const officialCountEl = document.getElementById('adminOfficialCount');
  const organizersCountEl = document.getElementById('adminOrganizersCount');
  const prizeValEl = document.getElementById('adminTotalPrizeVal');
  const searchInput = document.getElementById('adminSearchInput');

  if (!tableBody) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  let totalEvents = state.allEvents.length;
  let officialCount = 0;
  let totalPrize = 0;
  const organizers = new Set();

  state.allEvents.forEach(evt => {
    if (evt.is_official) officialCount++;
    if (evt.organizer_name) organizers.add(evt.organizer_name.trim());
    if (evt.prize_pool) totalPrize += parsePrizePool(evt.prize_pool);
  });

  if (totalEventsEl) totalEventsEl.textContent = totalEvents;
  if (officialCountEl) officialCountEl.textContent = officialCount;
  if (organizersCountEl) organizersCountEl.textContent = organizers.size;
  if (prizeValEl) prizeValEl.textContent = formatPrizeTotal(totalPrize);

  tableBody.innerHTML = '';

  const filtered = state.allEvents.filter(evt => {
    if (!query) return true;
    return (
      (evt.title || '').toLowerCase().includes(query) ||
      (evt.category || '').toLowerCase().includes(query) ||
      (evt.organizer_name || '').toLowerCase().includes(query) ||
      (evt.sector || '').toLowerCase().includes(query)
    );
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem; color: #64748b;">
          No events match your filter query.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(evt => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="cell-title">${evt.title}</span>
        <span class="cell-subtitle">${evt.sector || 'Islamabad'}</span>
      </td>
      <td><span class="category-tag">${evt.category}</span></td>
      <td>${evt.organizer_name}</td>
      <td>${formatDate(evt.start_date)}</td>
      <td>
        <span class="status-badge ${evt.is_official ? 'official' : 'community'}">
          <i data-lucide="${evt.is_official ? 'badge-check' : 'users'}" style="width:12px;height:12px;"></i>
          ${evt.is_official ? 'Official' : 'Community'}
        </span>
      </td>
      <td>
        <div class="admin-actions">
          <button class="btn-admin-icon ${evt.is_official ? 'active' : ''} toggle-official-btn" data-id="${evt.id}" title="${evt.is_official ? 'Remove Official Badge' : 'Mark as Official'}">
            <i data-lucide="badge-check"></i>
          </button>
          <button class="btn-admin-icon edit-btn" data-id="${evt.id}" title="Edit Event">
            <i data-lucide="edit-3"></i>
          </button>
          <button class="btn-admin-icon danger delete-btn" data-id="${evt.id}" title="Delete Event">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function handleAdminToggleOfficial(id) {
  const evt = state.allEvents.find(e => e.id === id);
  if (!evt) return;

  const newStatus = !evt.is_official;
  evt.is_official = newStatus;

  await supabaseService.updateEvent(id, { is_official: newStatus });
  showToast(`Event updated to ${newStatus ? 'OFFICIAL' : 'COMMUNITY'} status!`, 'success');
  renderAdminDashboard();
  renderGrid();
}

// MODAL UTILS
function openModal(modal) {
  if (modal) modal.style.display = 'flex';
}

function closeModal(modal) {
  if (modal) modal.style.display = 'none';
}

// TOAST MESSAGES
function showToast(message, type = 'info') {
  if (!elements.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'warning') iconName = 'alert-triangle';

  toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${message}</span>`;
  elements.toastContainer.appendChild(toast);
  initIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
