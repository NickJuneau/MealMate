//Mobile Menu Functionality
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerButton = document.querySelector('.hamburger-button');
    const mobileMenu = document.querySelector('.mobile-menu');
    

    hamburgerButton.addEventListener('click', () => mobileMenu.classList.toggle('active'));
});

//Main Content Functionality

const RETAIL_PER_WEEK = 7;
const STORAGE_KEY_USED = "mealmate_used";
const STORAGE_KEY_WEEK = "mealmate_week_start";

let swipeCount = RETAIL_PER_WEEK; // will be overridden by init
let countdownTimer = null;

// ---------- Helpers ----------
function getWeekStartForThursday(date = new Date()) {
  // date is local Date
  const d = new Date(date);
  // JS getDay() syntax: Sunday=0, Monday=1, ... Saturday=6
  const THURSDAY = 4;
  const current = d.getDay();
  const daysBack = ((current - THURSDAY) + 7) % 7;
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - daysBack);
  weekStart.setHours(0, 0, 0, 0);
  // return ISO in UTC for stable storage
  // convert local midnight to UTC ISO
  return new Date(weekStart.getTime() - weekStart.getTimezoneOffset() * 60000).toISOString();
}

function getNextThursday(date = new Date()) {
  const d = new Date(date);
  const THURSDAY = 4;
  const current = d.getDay();
  // days until next Thursday
  let daysAhead = (THURSDAY - current + 7) % 7;
  if (daysAhead === 0) daysAhead = 7; // next Thursday (not today)
  const next = new Date(d);
  next.setDate(d.getDate() + daysAhead);
  next.setHours(0, 0, 0, 0);
  return next;
}

function daysUntilNextThursday() {
  const now = new Date();
  const next = getNextThursday(now);
  // compute difference in days (round down)
  const diffMs = next.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)); // ceil for formatting
  return days;
}

function readStoredState() {
  try {
    const storedWeek = localStorage.getItem(STORAGE_KEY_WEEK);
    const storedUsed = parseInt(localStorage.getItem(STORAGE_KEY_USED), 10);
    const used = Number.isFinite(storedUsed) ? storedUsed : null;
    return { storedWeek, used };
  } catch (e) {
    console.error("Error reading localStorage", e);
    return { storedWeek: null, used: null };
  }
}

function writeStoredState(weekIso, used) {
  try {
    localStorage.setItem(STORAGE_KEY_WEEK, weekIso);
    localStorage.setItem(STORAGE_KEY_USED, String(used));
  } catch (e) {
    console.error("Error writing localStorage", e);
  }
}

// ---------- UI update ----------
function updateUI() {
  const countText = document.querySelector('.counter-data');
  const dayCountdown = document.querySelector('.day-countdown');
  const downBtn = document.querySelector('.downButton');
  const upBtn = document.querySelector('.upBotton');

  if (countText) countText.textContent = swipeCount;
  if (dayCountdown) {
    const days = daysUntilNextThursday();
    dayCountdown.textContent = `Resetting in ${days} day${days > 1 ? "s" : ""}`;
  }

  if (downBtn) downBtn.disabled = swipeCount <= 0;
  if (upBtn) upBtn.disabled = swipeCount >= RETAIL_PER_WEEK;
}

// ---------- State transitions ----------
function setSwipeCount(newCount) {
  swipeCount = Math.max(0, Math.min(RETAIL_PER_WEEK, newCount));
  const weekIso = getWeekStartForThursday();
  writeStoredState(weekIso, swipeCount);
  updateUI();
}

function incrementSwipe() {
  if (swipeCount >= RETAIL_PER_WEEK) 
    return;
  setSwipeCount(swipeCount + 1);
}

function decrementSwipe() {
  if (swipeCount <= 0) 
    return;
  setSwipeCount(swipeCount - 1);
}

// ---------- Initialization ----------
function initialize() {
  // Attach event listeners
  const downCountButton = document.querySelector('.downButton');
  const upCountButton = document.querySelector('.upBotton');

  if (downCountButton) downCountButton.addEventListener('click', decrementSwipe);
  if (upCountButton) upCountButton.addEventListener('click', incrementSwipe);

  // Determine week start and stored state
  const currentWeek = getWeekStartForThursday(new Date());
  const { storedWeek, used } = readStoredState();

  // If no storedWeek > initialize
  if (!storedWeek) {
    // first run
    swipeCount = RETAIL_PER_WEEK;
    writeStoredState(currentWeek, swipeCount);
  } else {
    // If storedWeek != currentWeek then reset used
    if (storedWeek !== currentWeek) {
      swipeCount = 0;
      writeStoredState(currentWeek, swipeCount);
    } else {
      // use stored value (default to 0 if invalid)
      swipeCount = Number.isFinite(used) ? used : 0;
      // guard bounds
      swipeCount = Math.max(0, Math.min(RETAIL_PER_WEEK, swipeCount));
      writeStoredState(currentWeek, swipeCount);
    }
  }

  updateUI();

  // Start a timer to update the countdown text at midnight and on visibilitychange
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(updateUI, 1000 * 60 * 30); // Update every 30m
  // Update when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // re-check week boundary when user returns
      const newWeek = getWeekStartForThursday(new Date());
      const stored = localStorage.getItem(STORAGE_KEY_WEEK);
      if (stored !== newWeek) {
        // week changed while user was away -> reset
        swipeCount = 0;
        writeStoredState(newWeek, swipeCount);
      }
      updateUI();
    }
  });
}

// Run init after DOM ready
document.addEventListener('DOMContentLoaded', initialize);

// FOR TESTING: keyboard shortcuts for up/down (u/d)
document.addEventListener('keydown', (e) => {
  if (e.key === 'u' || e.key === 'U') incrementSwipe();
  if (e.key === 'd' || e.key === 'D') decrementSwipe();
});
