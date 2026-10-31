/* Configure this app with your own Firebase project before deployment. */
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_WEB_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_DATABASE_HOST",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID",
};

firebase.initializeApp(firebaseConfig);

let foodConfig = {};
let isDeviceOnline = false;

// ================= THEME LOGIC =================
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeUI(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";

  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeUI(newTheme);
}

function updateThemeUI(theme) {
  // Update icons in both header and mobile settings
  const icons = document.querySelectorAll(".theme-icon-el");
  icons.forEach((icon) => {
    icon.setAttribute(
      "name",
      theme === "light" ? "moon-outline" : "sunny-outline",
    );
  });
}

// ================= MOBILE APP LOGIC =================
function isMobileApp() {
  return navigator.userAgent.includes("AquaFeedApp");
}

function showSection(sectionId) {
  // Only execute switching if we are in the mobile app environment
  if (!isMobileApp()) return;

  const sections = ["foodControl", "foodConfig", "activity"];

  sections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = id === sectionId ? "block" : "none";
    }
  });

  // Bottom nav active state
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    const onclick = item.getAttribute("onclick");
    if (onclick && onclick.includes(`'${sectionId}'`)) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

// Expose showSection to global window for Android WebView to call
window.showSection = showSection;

// ================= INIT =================
$(document).ready(function () {
  initTheme();

  // Handle Mobile App Initial State
  if (isMobileApp()) {
    document.body.classList.add("has-mobile-nav");
    document.getElementById("bottomNav").style.display = "flex";

    // Hide header toggle, show in-card toggle
    document.getElementById("header-theme-toggle").style.display = "none";
    document.getElementById("mobile-theme-toggle").style.display = "block";

    showSection("foodControl");
  }

  // Load foodConfig
  firebase
    .database()
    .ref("foodConfig")
    .on("value", function (snapshot) {
      if (snapshot.exists()) {
        foodConfig = snapshot.val();
        console.log("Food config loaded:", foodConfig);
        updateFlowRateDisplay();
      } else {
        console.warn("foodConfig missing in database");
      }
    });

  // Default UI values
  document.getElementById("foodTypeDisplay").value = "Pellets";
  document.getElementById("foodTypeDisplayConfig").value = "Pellets";
  document.getElementById("foodSizeDisplay").value = "micro";
  document.getElementById("foodSizeDisplayConfig").value = "micro";

  addActivityListener();
  addDiv();
  addDeviceStatusListener();
  addCalibrationListener();
});

// ================= FOOD TYPE =================
let tempFoodType = "pellets";
let tempFoodSize = "micro";

function openFoodTypeModal() {
  tempFoodType = document.getElementById("foodType").value;
  updateFoodTypeModalUI();
  document.getElementById("food-type-modal").classList.add("show");
}

function closeFoodTypeModal() {
  document.getElementById("food-type-modal").classList.remove("show");
}

function selectModalFoodType(type) {
  tempFoodType = type;
  updateFoodTypeModalUI();
}

function updateFoodTypeModalUI() {
  const container = document.getElementById("foodTypeOptions");
  container.innerHTML = `     <button class="food-option-btn ${tempFoodType === "pellets" ? "active" : ""}" onclick="selectModalFoodType('pellets')">Pellets</button>     <button class="food-option-btn ${tempFoodType === "granules" ? "active" : ""}" onclick="selectModalFoodType('granules')">Granules</button>
  `;
}

function confirmFoodType() {
  const oldType = document.getElementById("foodType").value;
  const capitalized = capitalize(tempFoodType);

  document.getElementById("foodType").value = tempFoodType;
  document.getElementById("foodTypeDisplay").value = capitalized;
  document.getElementById("foodTypeDisplayConfig").value = capitalized;

  closeFoodTypeModal();

  if (oldType !== tempFoodType) {
    if (tempFoodType === "pellets") {
      setFoodSize("micro");
    } else {
      setFoodSize("fine");
    }
  }
  updateFlowRateDisplay();
}

// ================= FOOD SIZE =================
function openFoodSizeModal() {
  tempFoodSize = document.getElementById("foodSize").value;
  updateFoodSizeModalUI();
  document.getElementById("food-size-modal").classList.add("show");
}

function closeFoodSizeModal() {
  document.getElementById("food-size-modal").classList.remove("show");
}

function selectModalFoodSize(size) {
  tempFoodSize = size;
  updateFoodSizeModalUI();
}

function updateFoodSizeModalUI() {
  const type = document.getElementById("foodType").value;
  const container = document.getElementById("foodSizeOptions");

  if (type === "pellets") {
    container.innerHTML = `
      <button class="food-option-btn ${tempFoodSize === "micro" ? "active" : ""}" onclick="selectModalFoodSize('micro')">micro</button>
      <button class="food-option-btn ${tempFoodSize === "3mm" ? "active" : ""}" onclick="selectModalFoodSize('3mm')">3mm</button>
    `;
  } else {
    container.innerHTML = `
      <button class="food-option-btn ${tempFoodSize === "fine" ? "active" : ""}" onclick="selectModalFoodSize('fine')">fine</button>
      <button class="food-option-btn ${tempFoodSize === "coarse" ? "active" : ""}" onclick="selectModalFoodSize('coarse')">coarse</button>
    `;
  }
}

function confirmFoodSize() {
  setFoodSize(tempFoodSize);
  closeFoodSizeModal();
  updateFlowRateDisplay();
}

function setFoodSize(size) {
  document.getElementById("foodSize").value = size;
  document.getElementById("foodSizeDisplay").value = size;
  document.getElementById("foodSizeDisplayConfig").value = size;
}

// ================= FLOW RATE DISPLAY =================
function updateFlowRateDisplay() {
  const type = document.getElementById("foodType").value;
  const size = document.getElementById("foodSize").value;
  const rateDisplay = document.getElementById("flowRateValue");

  if (foodConfig[type] && foodConfig[type][size]) {
    rateDisplay.innerText = foodConfig[type][size].toFixed(2);
  } else {
    rateDisplay.innerText = "0.00";
  }
}

// ================= CALIBRATION =================
function calibrateFeeder() {
  const btn = document.getElementById("btn-calibrate");
  const statusEl = document.getElementById("calibration-status");
  const instructionEl = document.getElementById("calibration-instruction");

  if (!isDeviceOnline) {
    statusEl.innerText = "Feeder not connected!";
    statusEl.style.display = "block";
    
    // Trigger animation class
    statusEl.classList.add("status-alert-active");
    
    // Hide instruction with fade
    instructionEl.style.opacity = "0";
    instructionEl.style.visibility = "hidden";
    
    setTimeout(() => {
      statusEl.style.display = "none";
      statusEl.classList.remove("status-alert-active");
      
      instructionEl.style.visibility = "visible";
      setTimeout(() => {
        instructionEl.style.opacity = "1";
      }, 10);
    }, 1500);
    return;
  }

  if (btn.disabled) return;

  // Firebase update - Only set calibrate to 1
  firebase.database().ref("settings/calibrate").set(1);

  // UI Feedback
  btn.innerText = "Calibrating...";
  btn.disabled = true;
  btn.style.opacity = "0.7";

  // Auto-reset after 3 seconds as a fallback
  setTimeout(() => {
    resetCalibrateBtn();
  }, 3000);
}

function addCalibrationListener() {
  firebase
    .database()
    .ref("settings/calibrate")
    .on("value", (snapshot) => {
      const val = snapshot.val();
      if (val === 0) {
        resetCalibrateBtn();
      }
    });
}

function resetCalibrateBtn() {
  const btn = document.getElementById("btn-calibrate");
  if (btn && btn.disabled) {
    btn.innerText = "Calibrate Feeder";
    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

// ================= FEED FUNCTION =================
function feednow() {
  const statusEl = document.querySelector(".status-text");

  if (!isDeviceOnline) {
    // Highlight the existing message
    statusEl.innerText = "Feeder not connected!";
    statusEl.classList.add("status-alert-active");

    setTimeout(() => {
      statusEl.classList.remove("status-alert-active");
    }, 1500);
    return;
  }

  const selectedFood = document.getElementById("foodType").value;
  const selectedSize = document.getElementById("foodSize").value;

  let grams = parseFloat(document.getElementById("foodGrams").value);

  // Validation
  if (isNaN(grams) || grams <= 0) {
    alert("Enter a valid amount");
    return;
  }

  if (grams > 20) {
    alert("Too much food!");
    return;
  }

  if (Object.keys(foodConfig).length === 0) {
    statusEl.innerText = "Config loading...";
    return;
  }

  if (!foodConfig[selectedFood] || !foodConfig[selectedFood][selectedSize]) {
    alert("Food configuration missing");
    return;
  }

  // FIXED: rate is directly the value
  const rate = foodConfig[selectedFood][selectedSize];

  const duration = Math.round((grams / rate) * 1000);

  console.log(
    "Feeding:",
    selectedFood,
    selectedSize,
    grams,
    "→",
    duration,
    "ms",
  );

  firebase.database().ref().update({
    feednow: 1,
    "settings/foodType": selectedFood,
    "settings/size": selectedSize,
    "settings/grams": grams,
    "settings/duration": duration,
  });

  // UI feedback
  statusEl.innerText = `Feeding ${grams}g (${duration} ms)...`;
  statusEl.style.color = "var(--primary-blue-dark)";

  setTimeout(() => {
    statusEl.innerText = "Awaiting Command...";
    statusEl.style.color = "var(--text-light)";
  }, 4000);
}

// ================= HELPERS =================
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function addActivityListener() {
  var activityRef = firebase
    .database()
    .ref("activities")
    .orderByChild("timestamp")
    .limitToLast(10);

  activityRef.on("value", function (snapshot) {
    const container = document.getElementById("activity-list");
    container.innerHTML = "";

    if (!snapshot.exists()) {
      container.innerHTML = `
        <div class="empty-activity" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 6rem 2rem; color: var(--text-light); text-align: center;">
          <ion-icon name="time-outline" style="font-size: 5rem; margin-bottom: 1.5rem; opacity: 0.3;"></ion-icon>
          <p style="font-size: 1.5rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.5rem;">No activity yet</p>
          <p style="font-size: 1.2rem; opacity: 0.8;">Recent feedings will show up here</p>
        </div>
      `;
      return;
    }

    let activities = [];

    snapshot.forEach(function (childSnapshot) {
      activities.push(childSnapshot.val());
    });

    activities.reverse();

    activities.forEach(function (activity) {
      let date = new Date(activity.timestamp * 1000 || Date.now());

      let timeString = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      let dateString = date.toLocaleDateString();

      const displayText = `${activity.title} (${activity.grams}g ${activity.size} ${activity.foodType})`;

      const html = `
        <div class="activity-item">
          <div class="activity-icon">
            <ion-icon name="water"></ion-icon>
          </div>
          <div class="activity-details">
            <span class="activity-title">${displayText}</span>
            <span class="activity-time">${dateString} at ${timeString}</span>
          </div>
        </div>
      `;

      container.innerHTML += html;
    });
  });
}

function openTimeModal() {
  document.getElementById("timeModal").classList.add("show");
  // Reset error
  document.getElementById("schedule-error").style.display = "none";
}

function closeTimeModal() {
  document.getElementById("timeModal").classList.remove("show");
}

// ================= TIME SELECTION LOGIC =================
function toggleAmPm() {
  const btn = document.getElementById("ampm-toggle");
  if (btn.innerText === "AM") {
    btn.innerText = "PM";
  } else {
    btn.innerText = "AM";
  }
}

function addTime() {
  let hh = parseInt(document.getElementById("hr-input").value);
  let mm = parseInt(document.getElementById("min-input").value);
  const ampm = document.getElementById("ampm-toggle").innerText;
  const errorEl = document.getElementById("schedule-error");

  if (isNaN(hh) || isNaN(mm)) {
    return;
  }

  // Basic validation
  if (hh < 1) hh = 1;
  if (hh > 12) hh = 12;
  if (mm < 0) mm = 0;
  if (mm > 59) mm = 59;

  // Convert to 24h for Firebase
  let h = hh;
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;

  const finalTime = `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;

  // original behavior (matching your ESP)
  let countRef = firebase.database().ref("count");

  countRef.once("value", function (snapshot) {
    let count = snapshot.val() || 0;

    if (count >= 3) {
      // SHOW INTEGRATED ERROR INSTEAD OF ALERT
      errorEl.style.display = "block";
      errorEl.classList.add("status-alert-active");
      
      setTimeout(() => {
          errorEl.classList.remove("status-alert-active");
      }, 1500);
      return;
    }

    firebase
      .database()
      .ref("timers/timer" + count)
      .set(finalTime);
    firebase
      .database()
      .ref("count")
      .set(count + 1);

    closeTimeModal();
  });
}

function removeDiv(idv) {
  firebase
    .database()
    .ref("timers/" + idv)
    .remove();

  firebase
    .database()
    .ref("count")
    .once("value", function (snapshot) {
      let count = snapshot.val() || 0;
      if (count > 0) {
        firebase
          .database()
          .ref("count")
          .set(count - 1);
      }
    });
}

function addDiv() {
  var divRef = firebase.database().ref("timers");
  divRef.on("value", function (snapshot) {
    var obj = snapshot.val();
    const activeRoutinesContainer = document.querySelector(".active-routines");
    $("#wrapper").empty();

    if (!obj || Object.keys(obj).length === 0) {
      activeRoutinesContainer.style.display = "none";
      return;
    }

    activeRoutinesContainer.style.display = "block";

    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        let tsData = obj[key];
        let ts = typeof tsData === "object" ? tsData.time : tsData;

        if (!ts || typeof ts !== "string") continue;

        // Format time properly to 12 AM/PM
        var H = +ts.substr(0, 2);
        var h = H % 12 || 12;
        h = h < 10 ? "0" + h : h; // leading 0
        var ampm = H < 12 ? " AM" : " PM";
        let displayTime = h + ts.substr(2, 3) + ampm;

        const x = `
            <div class="routine-item" id="${key}">
                <div class="routine-time">
                ${displayTime}
                </div>
                <div class="routine-delete" onclick="removeDiv('${key}')">
                    <ion-icon name="close-circle"></ion-icon>
                </div>
            </div>`;

        $("#wrapper").append(x);
      }
    }
  });
}

function addDeviceStatusListener() {
  const statusBadge = document.querySelector(".status-badge");
  const feedBtn = document.querySelector(".btn-feed");
  const calibrateBtn = document.getElementById("btn-calibrate");
  const statusEl = document.querySelector(".status-text");
  const calStatusEl = document.getElementById("calibration-status");
  let lastSeenVal = -1;
  let lastUpdateTime = 0;

  // Set initial "Checking..." UI
  statusBadge.innerHTML =
    '<span class="dot" style="background: #94a3b8; width: 0.8rem; height: 0.8rem; border-radius: 50%;"></span> Checking...';
  statusBadge.style.borderColor = "var(--border-color)";

  const setStatus = (isOnline) => {
    isDeviceOnline = isOnline;

    // UI Styling
    statusBadge.style.background = "var(--card-bg)";
    statusBadge.style.color = "var(--text-dark)";
    statusBadge.style.fontWeight = "600";
    statusBadge.style.padding = "0.8rem 1.6rem";
    statusBadge.style.borderRadius = "2rem";
    statusBadge.style.border = "1px solid var(--border-color)";
    statusBadge.style.fontSize = "1.2rem";
    statusBadge.style.display = "flex";
    statusBadge.style.alignItems = "center";
    statusBadge.style.gap = "0.8rem";
    statusBadge.style.boxShadow = "0 4px 10px rgba(0,0,0,0.05)";
    statusBadge.style.transition = "all 0.4s ease";

    if (isOnline) {
      statusBadge.innerHTML =
        '<span class="dot" style="background: var(--success-green); box-shadow: 0 0 8px var(--success-green); width: 0.8rem; height: 0.8rem; border-radius: 50%;"></span> Connected';
      statusBadge.style.borderColor = "var(--success-green)";
      
      [feedBtn, calibrateBtn].forEach(btn => {
        if (btn) {
          btn.style.opacity = "1";
          btn.style.filter = "none";
          btn.style.cursor = "pointer";
        }
      });
      
      statusEl.innerText = "Awaiting Command...";
      statusEl.style.color = "var(--text-light)";
      if (calStatusEl) calStatusEl.style.display = "none";
    } else {
      statusBadge.innerHTML =
        '<span class="dot" style="background: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.5); width: 0.8rem; height: 0.8rem; border-radius: 50%;"></span> Disconnected';
      statusBadge.style.borderColor = "rgba(239, 68, 68, 0.4)";
      
      [feedBtn, calibrateBtn].forEach(btn => {
        if (btn) {
          btn.style.opacity = "0.6";
          btn.style.filter = "grayscale(0.8)";
          btn.style.cursor = "not-allowed";
        }
      });

      statusEl.innerText = "Feeder not connected!";
      statusEl.style.color = "var(--text-light)";
    }
  };

  // Listen for device heartbeat
  firebase
    .database()
    .ref("device/lastSeen")
    .on("value", (snapshot) => {
      const val = snapshot.val();
      const nowSecs = Date.now() / 1000;

      // Case 1: Large number (Unix Timestamp)
      if (val > 1000000000) {
        // Only trust it if it's within the last 15 seconds
        if (nowSecs - val < 15) {
          lastUpdateTime = Date.now();
        }
      }
      // Case 2: Small number (Counter)
      else {
        // Only update heartbeat if the value has actually CHANGED
        if (val !== lastSeenVal) {
          lastUpdateTime = Date.now();
        }
      }
      lastSeenVal = val;
    });

  // Check heartbeat every second
  setInterval(() => {
    const isOnline = lastUpdateTime > 0 && Date.now() - lastUpdateTime < 15000;
    // Force set UI on the first tick or if state changed
    if (
      statusBadge.innerText.includes("Checking") ||
      isDeviceOnline !== isOnline
    ) {
      setStatus(isOnline);
    }
  }, 1000);
}
