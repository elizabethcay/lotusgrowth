// config

const API_KEY = "";

const CITIES = {
  hanoi: { lat: 21.0285, lon: 105.8542 },
  danang: { lat: 16.0544, lon: 108.2022 },
  hcmc: { lat: 10.8231, lon: 106.6297 },
};

const THRESHOLDS = {
  rain: { min: 1, max: 10 },
  cloud: { min: 0, max: 50 },
  humid: { min: 70, max: 85 },
};

// states

let selectedCity = "hanoi";
let isLoading = false;

// dom references -> maps to html

const cityGroup = document.getElementById("cityGroup");
const btnRefresh = document.getElementById("btnRefresh");

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const resultPanel = document.getElementById("resultPanel");

const barRain = document.getElementById("barRain");
const barCloud = document.getElementById("barCloud");
const barHumid = document.getElementById("barHumid");

const valRain = document.getElementById("valRain");
const valCloud = document.getElementById("valCloud");
const valHumid = document.getElementById("valHumid");

const badgeRain = document.getElementById("badgeRain");
const badgeCloud = document.getElementById("badgeCloud");
const badgeHumid = document.getElementById("badgeHumid");

const verdictBadge = document.getElementById("verdictBadge");

// helpers

function setStatus(state, message) {
  statusDot.className = "dot " + state;
  statusText.textContent = message;
}

function resetUI() {
  resultPanel.classList.remove("visible");

  barRain.style.width = "0%";
  barCloud.style.width = "0%";
  barHumid.style.width = "0%";

  valRain.textContent = "—";
  valCloud.textContent = "—";
  valHumid.textContent = "—";

  badgeRain.textContent = "—";
  badgeCloud.textContent = "—";
  badgeHumid.textContent = "—";

  verdictBadge.textContent = "—";
}

function isInRange(value, min, max) {
  return value >= min && value <= max;
}

function calculatePercent(value, max) {
  let scale = max * 1.5;
  let pct = (value / scale) * 100;

  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;

  return pct;
}

// render one factor

function renderFactor(bar, valueEl, badgeEl, value, min, max, unit) {
  const pass = isInRange(value, min, max);

  const percent = calculatePercent(value, max);
  bar.style.width = percent + "%";

  if (pass) {
    bar.className = "bar-fill pass";
    badgeEl.textContent = "Pass";
    badgeEl.className = "badge-pf pass";
  } else {
    bar.className = "bar-fill fail";
    badgeEl.textContent = "Fail";
    badgeEl.className = "badge-pf fail";
  }

  if (unit === "mm/hr") {
    valueEl.textContent = value.toFixed(1) + " " + unit;
  } else {
    valueEl.textContent = value.toFixed(0) + " " + unit;
  }

  return pass;
}

// verdict

function renderVerdict(passedCount) {
  if (passedCount === 3) {
    verdictBadge.textContent = "Optimal";
    verdictBadge.className = "verdict-badge optimal";
  } else if (passedCount >= 1) {
    verdictBadge.textContent = "Partial";
    verdictBadge.className = "verdict-badge partial";
  } else {
    verdictBadge.textContent = "Poor";
    verdictBadge.className = "verdict-badge poor";
  }
}

// city selection

const labels = cityGroup.querySelectorAll("label");

labels.forEach(label => {
  label.addEventListener("click", function () {
    labels.forEach(l => l.classList.remove("active"));
    label.classList.add("active");

    selectedCity = label.dataset.value;

    resetUI();

    setStatus(
      "idle",
      "Idle — press Refresh to load weather for " +
        label.querySelector("span").textContent
    );
  });
});

// fetch weather data

function fetchWeather() {
  if (isLoading) return;

  const city = CITIES[selectedCity];
  if (!city) return;

  isLoading = true;
  btnRefresh.disabled = true;

  setStatus("loading", "Fetching weather...");

  const url =
    "https://api.openweathermap.org/data/2.5/weather" +
    "?lat=" +
    city.lat +
    "&lon=" +
    city.lon +
    "&appid=" +
    API_KEY +
    "&units=metric";

  fetch(url)
    .then(function (res) {
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }
      return res.json();
    })
    .then(function (data) {
      const rain = data.rain ? data.rain["1h"] || 0 : 0;
      const cloud = data.clouds ? data.clouds.all : 0;
      const humid = data.main ? data.main.humidity : 0;

      const rainPass = renderFactor(
        barRain,
        valRain,
        badgeRain,
        rain,
        THRESHOLDS.rain.min,
        THRESHOLDS.rain.max,
        "mm/hr"
      );

      const cloudPass = renderFactor(
        barCloud,
        valCloud,
        badgeCloud,
        cloud,
        THRESHOLDS.cloud.min,
        THRESHOLDS.cloud.max,
        "%"
      );

      const humidPass = renderFactor(
        barHumid,
        valHumid,
        badgeHumid,
        humid,
        THRESHOLDS.humid.min,
        THRESHOLDS.humid.max,
        "%"
      );

      const total =
        (rainPass ? 1 : 0) +
        (cloudPass ? 1 : 0) +
        (humidPass ? 1 : 0);

      renderVerdict(total);

      resultPanel.classList.add("visible");

      const now = new Date();
      setStatus(
        "live",
        "Live — last updated " + now.toLocaleTimeString()
      );
    })
    .catch(function (err) {
      setStatus("error", "Error: " + err.message);
      resetUI();
    })
    .finally(function () {
      isLoading = false;
      btnRefresh.disabled = false;
    });
}

btnRefresh.addEventListener("click", fetchWeather);