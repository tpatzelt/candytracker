/* =============================
   DATA
   ============================= */
const DRUGS = [
  { id: 'weed', name: 'Weed', color: '#22c55e', icon: '\u{1F33F}' },
  { id: 'ketamine', name: 'Keta', color: '#06b6d4', icon: '\u{1F434}' },
  { id: 'cocaine', name: 'Koks', color: '#e2e8f0', icon: '\u2744' },
  { id: 'mdma', name: 'Keks', color: '#f97316', icon: '\u{1F36A}' },
  { id: 'amphetamine', name: 'Pep', color: '#eab308', icon: '\u{1F680}' },
  { id: 'xtasy', name: 'Xtasy', color: '#ec4899', icon: '\u{1F48A}' },
  { id: 'lsd', name: 'LSD', color: '#a855f7', icon: '\u{1F6B2}' },
  { id: 'mushrooms', name: 'Pilze', color: '#a16207', icon: '\u{1F344}' },
  { id: 'unknown', name: 'Unknown', color: '#6b7280', icon: '?' },
];

const METHODS = [
  { id: 'smoked', label: 'Smoked', icon: '\u{1F525}' },
  { id: 'swallowed', label: 'Swallowed', icon: '\u{1F48A}' },
  { id: 'insufflated', label: 'Insufflated', icon: '\u2744' },
  { id: 'other', label: 'Other', icon: '\u22EF' },
];

const UNITS = ['g', 'mg', 'pill', 'tab', 'joint', 'line', 'hit', 'mushroom', 'custom'];

const TIME_OPTIONS = [
  { id: 'now', label: 'Now' },
  { id: '5min', label: '5 min ago' },
  { id: '10min', label: '10 min ago' },
  { id: 'custom', label: 'Custom' },
];

/* =============================
   HELPERS
   ============================= */
const $ = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m ago` : `${h}h ago`;
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'long' });
}

function fmtElapsed(start) {
  if (!start) return '0m';
  const diff = Date.now() - start;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0) return `${h}h ${rem}m`;
  return `${rem}m`;
}

function fmtFullDate(ts) {
  return new Date(ts).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/* =============================
   STORE
   ============================= */
const Store = {
  get(k) {
    try { return JSON.parse(localStorage.getItem('ct_' + k)); } catch { return null; }
  },
  set(k, v) {
    localStorage.setItem('ct_' + k, JSON.stringify(v));
  },
};

Store.intakes = {
  get() { return Store.get('intakes') || []; },
  set(v) { Store.set('intakes', v); },
  add(intake) {
    const list = this.get();
    list.unshift(intake);
    this.set(list);
    return intake;
  },
  remove(id) {
    const list = this.get();
    const idx = list.findIndex(i => i.id === id);
    if (idx > -1) list.splice(idx, 1);
    this.set(list);
    return list;
  },
  update(id, data) {
    const list = this.get();
    const idx = list.findIndex(i => i.id === id);
    if (idx > -1) Object.assign(list[idx], data);
    this.set(list);
    return list;
  },
  find(id) {
    return this.get().find(i => i.id === id);
  },
};

Store.session = {
  get() { return Store.get('session'); },
  set(v) { Store.set('session', v); },
  start() {
    const s = { id: uid(), startedAt: Date.now() };
    this.set(s);
    return s;
  },
  end() { this.set(null); },
};

/* =============================
   EVENT BUS
   ============================= */
const Bus = new EventTarget();
function emit(name, detail) {
  Bus.dispatchEvent(new CustomEvent(name, { detail }));
}
function on(name, fn) {
  Bus.addEventListener(name, fn);
}

/* =============================
   APP STATE
   ============================= */
let session = Store.session.get();
let intakes = Store.intakes.get();
let deleteUndo = null;
let refreshInterval = null;
let wasSwipe = false;

const sheetState = {
  open: false,
  drug: null,
  method: 'insufflated',
  amount: 0.25,
  unit: 'g',
  timeOption: 'now',
  customTime: null,
};

const editState = {
  intake: null,
  open: false,
};

/* =============================
   DOM REFS
   ============================= */
const $headerTime = $('#header-time');
const $sessionElapsed = $('#session-elapsed');
const $sessionEntries = $('#session-entries');
const $sessionStarted = $('#session-started');
const $timeline = $('#timeline-entries');
const $empty = $('#empty-state');
const $fab = $('#fab');
const $sheetOverlay = $('#sheet-overlay');
const $drugChips = $('#drug-chips');
const $methodGroup = $('#method-group');
const $amountInput = $('#amount-input');
const $unitSelect = $('#unit-select');
const $timeOptions = $('#time-options');
const $customTime = $('#custom-time-picker');
const $customTimeInput = $('#custom-time-input');
const $saveBtn = $('#save-btn');
const $saveText = $('.save-text');
const $saveCheck = $('.save-check');
const $detailOverlay = $('#detail-overlay');
const $detailIcon = $('#detail-icon');
const $detailDrug = $('#detail-drug');
const $detailMethod = $('#detail-method');
const $detailAmount = $('#detail-amount');
const $detailTime = $('#detail-time');
const $detailNotes = $('#detail-notes');
const $detailClose = $('#detail-close');
const $detailDelete = $('#detail-delete');
const $detailSave = $('#detail-save');
const $snackbar = $('#snackbar');
const $snackbarMsg = $('#snackbar-msg');
const $snackbarUndo = $('#snackbar-undo');
const $resetBtn = $('#reset-btn');
const $resetOverlay = $('#reset-overlay');
const $resetConfirm = $('#reset-confirm');
const $resetCancel = $('#reset-cancel');

/* =============================
   RENDER
   ============================= */
function renderHeader() {
  const now = new Date();
  $headerTime.innerHTML =
    `<span class="day">${fmtDate(now)}</span>` +
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function renderSession() {
  if (!session) {
    $sessionStarted.textContent = '--:--';
    $sessionEntries.textContent = '0';
    $sessionElapsed.textContent = '0m';
    return;
  }
  $sessionStarted.textContent = fmtTime(session.startedAt);
  $sessionEntries.textContent = intakes.length;
  $sessionElapsed.textContent = fmtElapsed(session.startedAt);
}

function renderTimeline() {
  $timeline.innerHTML = '';
  if (intakes.length === 0) {
    $empty.classList.remove('hidden');
    return;
  }
  $empty.classList.add('hidden');

  intakes.forEach(intake => {
    const drug = DRUGS.find(d => d.id === intake.drugId) || DRUGS[DRUGS.length - 1];
    const method = METHODS.find(m => m.id === intake.methodId) || METHODS[METHODS.length - 1];

    const card = document.createElement('div');
    card.className = 'entry-card';
    card.dataset.id = intake.id;
    card.innerHTML =
      `<div class="entry-icon" style="border-color:${drug.color};color:${drug.color}">${drug.icon}</div>` +
      `<div class="entry-body">` +
        `<div class="entry-top">` +
          `<span class="entry-drug">${drug.name}</span>` +
          `<span class="entry-method">${method.label}</span>` +
        `</div>` +
        `<div class="entry-bottom">` +
          (intake.amount ? `<span class="entry-amount">${intake.amount} ${intake.unit}</span><span class="entry-sep">\u00B7</span>` : '') +
          `<span class="entry-timeago" data-ts="${intake.timestamp}">${timeAgo(intake.timestamp)}</span>` +
        `</div>` +
      `</div>` +
      `<div class="entry-time">${fmtTime(intake.timestamp)}</div>`;

    card.addEventListener('click', e => {
      if (wasSwipe) { wasSwipe = false; return; }
      openDetail(intake.id);
    });

    let tx = null;
    const onStart = e => {
      tx = { startX: e.touches[0].clientX, id: intake.id, swiping: false };
    };
    const onMove = e => {
      if (!tx) return;
      const dx = e.touches[0].clientX - tx.startX;
      if (dx < 0) {
        tx.swiping = true;
        card.style.transform = `translateX(${Math.max(dx, -80)}px)`;
        card.style.opacity = 1 + Math.max(dx, -80) / 80;
      }
    };
    const onEnd = e => {
      if (!tx) return;
      const dx = e.changedTouches[0].clientX - tx.startX;
      if (dx < -40 && tx.swiping) {
        wasSwipe = true;
        deleteIntake(intake.id);
      } else {
        card.style.transform = '';
        card.style.opacity = '';
      }
      tx = null;
    };
    card.addEventListener('touchstart', onStart, { passive: true });
    card.addEventListener('touchmove', onMove, { passive: true });
    card.addEventListener('touchend', onEnd, { passive: true });

    $timeline.appendChild(card);
  });
}

function updateRelativeTimes() {
  $$('[data-ts]').forEach(el => {
    const ts = parseInt(el.dataset.ts);
    if (ts) el.textContent = timeAgo(ts);
  });
}

/* =============================
   BOTTOM SHEET
   ============================= */
function renderDrugChips() {
  $drugChips.innerHTML = '';
  DRUGS.forEach(drug => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (sheetState.drug === drug.id ? ' selected' : '');
    chip.dataset.id = drug.id;
    chip.innerHTML = `<span class="chip-icon">${drug.icon}</span>${drug.name}`;
    chip.addEventListener('click', () => {
      sheetState.drug = drug.id;
      renderDrugChips();
    });
    $drugChips.appendChild(chip);
  });

  const addChip = document.createElement('button');
  addChip.className = 'chip chip-add';
  addChip.textContent = '+ Custom';
  addChip.addEventListener('click', () => {
    const name = prompt('Custom substance name:');
    if (name && name.trim()) {
      const id = 'custom_' + uid();
      const color = '#6b7280';
      DRUGS.push({ id, name: name.trim(), color, icon: '\u25CB' });
      sheetState.drug = id;
      renderDrugChips();
    }
  });
  $drugChips.appendChild(addChip);
}

function renderMethodButtons() {
  $methodGroup.innerHTML = '';
  METHODS.forEach(method => {
    const btn = document.createElement('button');
    btn.className = 'method-btn' + (sheetState.method === method.id ? ' selected' : '');
    btn.innerHTML = `<span class="method-icon">${method.icon}</span>${method.label}`;
    btn.addEventListener('click', () => {
      sheetState.method = method.id;
      renderMethodButtons();
    });
    $methodGroup.appendChild(btn);
  });
}

function renderUnitSelect() {
  $unitSelect.innerHTML = '';
  UNITS.forEach(unit => {
    const opt = document.createElement('option');
    opt.value = unit;
    opt.textContent = unit;
    if (unit === sheetState.unit) opt.selected = true;
    $unitSelect.appendChild(opt);
  });
}

function renderTimeOptions() {
  $timeOptions.innerHTML = '';
  TIME_OPTIONS.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'time-btn' + (sheetState.timeOption === opt.id ? ' selected' : '');
    btn.textContent = opt.label;
    btn.dataset.id = opt.id;
    btn.addEventListener('click', () => {
      sheetState.timeOption = opt.id;
      renderTimeOptions();
      const show = opt.id === 'custom';
      $customTime.classList.toggle('hidden', !show);
      if (show && !$customTimeInput.value) {
        const d = new Date(Date.now() - 60000);
        $customTimeInput.value = d.toISOString().slice(0, 16);
      }
    });
    $timeOptions.appendChild(btn);
  });
}

function openSheet() {
  if (!session) {
    session = Store.session.start();
  }

  Object.assign(sheetState, {
    open: true, drug: null, method: 'insufflated',
    amount: 0.25, unit: 'g', timeOption: 'now', customTime: null,
  });

  $amountInput.value = '0.25';
  $saveText.classList.remove('hidden');
  $saveCheck.classList.add('hidden');
  $saveBtn.classList.remove('success');
  $saveBtn.disabled = false;
  $customTime.classList.add('hidden');

  renderDrugChips();
  renderMethodButtons();
  renderUnitSelect();
  renderTimeOptions();

  $sheetOverlay.classList.remove('hidden');
  void $sheetOverlay.offsetWidth;
  $sheetOverlay.classList.add('visible');
}

function closeSheet() {
  sheetState.open = false;
  $sheetOverlay.classList.remove('visible');
  setTimeout(() => $sheetOverlay.classList.add('hidden'), 300);
}

/* =============================
   SAVE ENTRY
   ============================= */
function saveEntry() {
  if (!sheetState.drug) {
    $drugChips.style.outline = '2px solid rgba(239,68,68,0.5)';
    $drugChips.style.borderRadius = '8px';
    setTimeout(() => { $drugChips.style.outline = ''; $drugChips.style.borderRadius = ''; }, 1000);
    return;
  }

  let timestamp = Date.now();
  if (sheetState.timeOption === '5min') timestamp = Date.now() - 5 * 60000;
  else if (sheetState.timeOption === '10min') timestamp = Date.now() - 10 * 60000;
  else if (sheetState.timeOption === 'custom' && $customTimeInput.value) {
    timestamp = new Date($customTimeInput.value).getTime();
  }

  const intake = {
    id: uid(),
    drugId: sheetState.drug,
    methodId: sheetState.method,
    amount: parseFloat($amountInput.value) || 0,
    unit: $unitSelect.value,
    timestamp,
    notes: '',
  };

  Store.intakes.add(intake);
  intakes = Store.intakes.get();

  $saveText.classList.add('hidden');
  $saveCheck.classList.remove('hidden');
  $saveBtn.classList.add('success');
  $saveBtn.disabled = true;

  if (navigator.vibrate) navigator.vibrate(10);

  emit('entry-added', intake);

  setTimeout(() => {
    closeSheet();
    renderSession();
    renderTimeline();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 600);
}

/* =============================
   DETAIL MODAL
   ============================= */
function openDetail(intakeId) {
  const intake = Store.intakes.find(intakeId);
  if (!intake) return;
  editState.intake = intake;
  editState.open = true;

  const drug = DRUGS.find(d => d.id === intake.drugId) || DRUGS[DRUGS.length - 1];
  const method = METHODS.find(m => m.id === intake.methodId) || METHODS[METHODS.length - 1];

  $detailIcon.textContent = drug.icon;
  $detailIcon.style.borderColor = drug.color;
  $detailIcon.style.color = drug.color;
  $detailDrug.textContent = drug.name;
  $detailMethod.textContent = method.label;
  $detailAmount.textContent = intake.amount ? `${intake.amount} ${intake.unit}` : '\u2014';
  $detailTime.textContent = fmtFullDate(intake.timestamp);
  $detailNotes.value = intake.notes || '';

  $detailOverlay.classList.remove('hidden');
  void $detailOverlay.offsetWidth;
  $detailOverlay.classList.add('visible');
}

function closeDetail() {
  editState.open = false;
  $detailOverlay.classList.remove('visible');
  setTimeout(() => $detailOverlay.classList.add('hidden'), 300);
}

function saveDetail() {
  if (!editState.intake) return;
  Store.intakes.update(editState.intake.id, { notes: $detailNotes.value.trim() });
  intakes = Store.intakes.get();
  closeDetail();
}

function deleteIntake(id) {
  const intake = Store.intakes.find(id);
  if (!intake) return;

  const card = $(`.entry-card[data-id="${id}"]`);
  if (card) card.classList.add('deleting');

  Store.intakes.remove(id);
  intakes = Store.intakes.get();

  closeDetail();

  setTimeout(() => {
    renderTimeline();
    renderSession();
  }, 300);

  deleteUndo = intake;
  const drug = DRUGS.find(d => d.id === intake.drugId);
  $snackbarMsg.textContent = `${drug ? drug.name : 'Entry'} deleted`;

  $snackbar.classList.remove('hidden');
  void $snackbar.offsetWidth;
  $snackbar.classList.add('visible');

  setTimeout(() => hideSnackbar(), 5000);
}

function hideSnackbar() {
  $snackbar.classList.remove('visible');
  setTimeout(() => $snackbar.classList.add('hidden'), 300);
  deleteUndo = null;
}

function undoDelete() {
  if (!deleteUndo) return;
  Store.intakes.add(deleteUndo);
  intakes = Store.intakes.get();
  deleteUndo = null;
  hideSnackbar();
  renderTimeline();
  renderSession();
}

/* =============================
   RESET SESSION
   ============================= */
function resetSession() {
  Store.intakes.set([]);
  Store.session.end();
  session = Store.session.start();
  intakes = [];
  Store.set('noDemo', true);
  closeResetModal();
  renderSession();
  renderTimeline();
}

function openResetModal() {
  $resetOverlay.classList.remove('hidden');
  void $resetOverlay.offsetWidth;
  $resetOverlay.classList.add('visible');
}

function closeResetModal() {
  $resetOverlay.classList.remove('visible');
  setTimeout(() => $resetOverlay.classList.add('hidden'), 300);
}

/* =============================
   REFRESH
   ============================= */
function refreshAll() {
  renderHeader();
  renderSession();
  updateRelativeTimes();
}

/* =============================
   INIT
   ============================= */
function init() {
  if (!session) {
    session = Store.session.start();
  }

  // Prepopulate with demo entries if empty (skip after user-initiated reset)
  if (intakes.length === 0 && !Store.get('noDemo')) {
    const now = Date.now();
    const demo = [
      { drugId: 'weed', methodId: 'smoked', amount: 0.5, unit: 'g', timestamp: now - 5 * 60000, notes: '' },
      { drugId: 'ketamine', methodId: 'insufflated', amount: 0.1, unit: 'g', timestamp: now - 24 * 60000, notes: '' },
      { drugId: 'mdma', methodId: 'swallowed', amount: 1, unit: 'pill', timestamp: now - 78 * 60000, notes: '' },
      { drugId: 'cocaine', methodId: 'insufflated', amount: 0.25, unit: 'g', timestamp: now - 120 * 60000, notes: '' },
    ];
    demo.forEach(d => {
      Store.intakes.add({ id: uid(), ...d });
    });
    intakes = Store.intakes.get();
  }

  renderHeader();
  renderSession();
  renderTimeline();

  refreshInterval = setInterval(refreshAll, 30000);

  /* --- FAB --- */
  $fab.addEventListener('click', openSheet);

  /* --- Sheet overlay --- */
  $sheetOverlay.addEventListener('click', e => {
    if (e.target === $sheetOverlay) closeSheet();
  });

  /* --- Save --- */
  $saveBtn.addEventListener('click', saveEntry);

  /* --- Amount input --- */
  $amountInput.addEventListener('input', () => {
    sheetState.amount = parseFloat($amountInput.value) || 0;
  });

  /* --- Unit select --- */
  $unitSelect.addEventListener('change', () => {
    sheetState.unit = $unitSelect.value;
  });

  /* --- Custom time --- */
  $customTimeInput.addEventListener('input', () => {
    sheetState.customTime = $customTimeInput.value;
  });

  /* --- Detail modal --- */
  $detailClose.addEventListener('click', closeDetail);
  $detailOverlay.addEventListener('click', e => {
    if (e.target === $detailOverlay) closeDetail();
  });
  $detailSave.addEventListener('click', saveDetail);
  $detailDelete.addEventListener('click', () => {
    if (editState.intake) deleteIntake(editState.intake.id);
  });

  /* --- Reset session --- */
  $resetBtn.addEventListener('click', openResetModal);
  $resetCancel.addEventListener('click', closeResetModal);
  $resetConfirm.addEventListener('click', resetSession);
  $resetOverlay.addEventListener('click', e => {
    if (e.target === $resetOverlay) closeResetModal();
  });

  /* --- Snackbar --- */
  $snackbarUndo.addEventListener('click', undoDelete);

  /* --- Re-render on events --- */
  on('entry-added', () => {
    renderTimeline();
    renderSession();
  });
  on('entry-deleted', () => {
    renderTimeline();
    renderSession();
  });
}

document.addEventListener('DOMContentLoaded', init);
