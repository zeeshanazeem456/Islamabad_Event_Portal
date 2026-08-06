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

// DOM ELEMENTS CACHE
const elements = {
  // Navigation & User
  navEventsBtn: document.getElementById('navEventsBtn'),
  navHandlersBtn: document.getElementById('navHandlersBtn'),
  navSavedBtn: document.getElementById('navSavedBtn'),
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
function initApp() {
  initIcons();
  setupEventListeners();
  setupImageUploadEvents();
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
    const isOwner = state.currentUser && (
      evt.organizer_name.toLowerCase().includes(state.currentUser.name?.toLowerCase() || '') ||
      evt.user_id === state.currentUser.email
    );

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
          <span class="prize-pill">${evt.prize_pool || evt.fee || 'Free'}</span>
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
  elements.statTotalEvents.textContent = `${state.allEvents.length}+`;
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
  if (elements.navEventsBtn) elements.navEventsBtn.addEventListener('click', () => switchTab('events'));
  if (elements.navHandlersBtn) elements.navHandlersBtn.addEventListener('click', () => switchTab('handlers'));
  if (elements.navSavedBtn) elements.navSavedBtn.addEventListener('click', () => switchTab('saved'));

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
        const id = deleteBtn.dataset.id;
        handleDeleteEvent(id);
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

  // Auth Buttons
  if (elements.openAuthBtn) elements.openAuthBtn.addEventListener('click', () => openModal(elements.authModal));
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
      navigator.clipboard.writeText(window.location.href);
      showToast('Event link copied to clipboard!', 'success');
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
}

// TAB SWITCHING
function switchTab(tab) {
  state.currentTab = tab;

  if (elements.navEventsBtn) elements.navEventsBtn.classList.toggle('active', tab === 'events');
  if (elements.navHandlersBtn) elements.navHandlersBtn.classList.toggle('active', tab === 'handlers');
  if (elements.navSavedBtn) elements.navSavedBtn.classList.toggle('active', tab === 'saved');

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
  applyFilters();
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
  if (elements.detailPrize) elements.detailPrize.textContent = evt.prize_pool || evt.fee || 'Free';
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
  if (elements.postPrize) elements.postPrize.value = evt.prize_pool || '';
  if (elements.postRegisterUrl) elements.postRegisterUrl.value = evt.registration_url || '';
  if (elements.postDescription) elements.postDescription.value = evt.description;
  if (elements.postAgenda) elements.postAgenda.value = evt.agenda || '';

  if (evt.banner_url && evt.banner_url.startsWith('data:image')) {
    state.uploadedBannerData = evt.banner_url;
    if (elements.imagePreview) elements.imagePreview.src = evt.banner_url;
    if (elements.imagePreviewContainer) elements.imagePreviewContainer.style.display = 'block';
    if (elements.dropzoneBox) elements.dropzoneBox.style.display = 'none';
    setImageMode('upload');
  } else if (evt.banner_url && evt.banner_url.startsWith('http')) {
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
  } else if (state.bannerMode === 'url' && elements.postCustomBanner) {
    banner = elements.postCustomBanner.value.trim() || 'assets/city-event-board.png';
  }

  let selectedCategory = elements.postCategory ? elements.postCategory.value : 'Hackathon';
  if (selectedCategory === 'Other') {
    const customCat = elements.postCustomCategory ? elements.postCustomCategory.value.trim() : '';
    selectedCategory = customCat || 'Other';
  }

  const formData = {
    title: elements.postTitle ? elements.postTitle.value.trim() : '',
    category: selectedCategory,
    format: elements.postFormat ? elements.postFormat.value : 'In-Person',
    sector: elements.postSector ? elements.postSector.value.trim() : 'Islamabad',
    organizer_name: elements.postOrganizer ? elements.postOrganizer.value.trim() : 'Organizer',
    start_date: elements.postStartDate ? elements.postStartDate.value : '',
    deadline: elements.postDeadline ? elements.postDeadline.value : '',
    prize_pool: (elements.postPrize ? elements.postPrize.value.trim() : '') || 'Free',
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
  } else {
    const res = await supabaseService.signInUser(email, password);
    if (!res.success) {
      showToast(`Sign In Error: ${res.error}`, 'warning');
      return;
    }
    showToast(`Signed in via Supabase! Welcome back, ${name}.`, 'success');
  }

  state.currentUser = {
    email,
    name,
    role: 'manager'
  };

  localStorage.setItem('isb_current_user', JSON.stringify(state.currentUser));
  updateUserUI();
  closeModal(elements.authModal);
}

function updateUserUI() {
  if (state.currentUser) {
    if (elements.userAuthSection) {
      elements.userAuthSection.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span style="font-size:0.85rem; font-weight:700; color:#111827;">${state.currentUser.name}</span>
          <button id="logoutBtn" class="btn-secondary" style="padding:0.4rem 0.75rem; font-size:0.8rem;">Logout</button>
        </div>
      `;
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          state.currentUser = null;
          localStorage.removeItem('isb_current_user');
          updateUserUI();
          showToast('Logged out.', 'info');
          switchTab('events');
        });
      }
    }
  } else {
    if (elements.userAuthSection) {
      elements.userAuthSection.innerHTML = `
        <button class="btn-secondary" id="openAuthBtn">Sign in</button>
      `;
      const btn = document.getElementById('openAuthBtn');
      if (btn) btn.addEventListener('click', () => openModal(elements.authModal));
    }
  }
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
