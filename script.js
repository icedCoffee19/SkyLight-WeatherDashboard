// ========================= 🔑 API Setup =========================
const API_KEY = "7a3e00ec6ad47a0e5a41deb69a765b86"; // my OpenWeatherMap API key
const BASE_URL = "https://api.openweathermap.org/data/2.5/";
const AQI_URL = `${BASE_URL}air_pollution?appid=${API_KEY}`; // separate endpoint for AQI

let map; // variable to store leaflet map instance

const aqiStatus = ["", "Good", "Fair", "Moderate", "Poor", "Very Poor"]; //utilities for AQI

// =========================📍 Sourcing Geolocation (from Geolocation API) - and applying FetchAndDisplayAllData function =========================
navigator.geolocation.getCurrentPosition(success, error);

//CASE1: Location obtained - Fetch and display weather data for current location
function success(position) {
  const { latitude, longitude } = position.coords;
  fetchAndDisplayAllData(latitude, longitude, 'weather-info', 'current');
}

//CASE2: Location access denied - Show message and static image
function error() {
  document.getElementById("weather-info").innerHTML =
    '<p>Location access denied. Please search by city.</p>' +
    '<div class="static-image-container static-current"></div>'; 
}

// ========================= ☁️ FetchAndDisplayAllData Function - unified function to fetch and display weather & forecast data =========================
async function fetchAndDisplayAllData(param1, param2, targetElementId, fetchType) {
  let weatherEndpoint, forecastEndpoint, lat, lon;

  // Defining endpoints, lon & lat (based on fetch type) - for fetching data from APIs
    if (fetchType === 'current') {
    weatherEndpoint = `${BASE_URL}weather?lat=${param1}&lon=${param2}&units=metric&appid=${API_KEY}`;
    forecastEndpoint = `${BASE_URL}forecast?lat=${param1}&lon=${param2}&units=metric&appid=${API_KEY}`;
    lat = param1;
    lon = param2; }
  else // fetchType === 'search' - only weatherEndpoint is defined here
  { weatherEndpoint = `${BASE_URL}weather?q=${param1}&units=metric&appid=${API_KEY}`; }

  //Data Display Logic
  try {
    // 1. Fetching Weather Data (from OpenWeatherMap API)
    
    /*CASE1: fetch_type = current - we have lat, lon from geolocation,
                                  - we derive weatherEndpoint from lat, lon,
                                  - we derive weatherData from weatherEndpoint */
      
    /*CASE2: fetch_type = search - we have city name from user input ,
                                  - we derive weatherEndpoint from city name,
                                  - we derive weatherData from weatherEndpoint*/

    const weatherResponse = await fetch(weatherEndpoint);
    const weatherData = await weatherResponse.json();

    //CASE3: city not found error 
    if (weatherData.cod === "404") {
      document.getElementById(targetElementId).innerHTML = '<p>City not found.</p>';
      return;
    }

    //------------ BEFORE FETCHING AQI AND FORECAST DATA ----------------
    /* For fetch_type = current - we have lat, lon from geolocation,
                                - we derive have forecastEndpoint from lat, lon
                                - we derive forecastData from forecastEndpoint  & AQI data from lat,lon*/

    /* For fetch_type = search - we have city name from user input ,
                               - we derive weatherEndpoint from city name,
                               - we derive weatherData from weatherEndpoint,
                               - we derive lat, lon & forecastEndpoint from weatherData,
                               - we derive forecastData from forecastEndpoint & AQI data from lat,lon*/
    if (fetchType === 'search') {
        lat = weatherData.coord.lat;
        lon = weatherData.coord.lon;
        forecastEndpoint = `${BASE_URL}forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    }
    
    // 2. Fetching AQI data (from OpenWeatherMap API)
    const aqiResponse = await fetch(`${AQI_URL}&lat=${lat}&lon=${lon}`);
    const aqiData = await aqiResponse.json();

    // 3. Displaying all data
    displayWeatherInfo(weatherData, aqiData, targetElementId, fetchType);

    // 4. Fetching Forecast data (from OpenWeatherMap API)
    // (NOTE: forecastEndpoint is only defined for 'current' fetchType)
    const forecastResponse = await fetch(forecastEndpoint);
    const forecastData = await forecastResponse.json();
    displayForecast(forecastData);

  }

  // Data Fetch Error Handling
  catch (err) {
    console.error(`Error fetching data for ${fetchType}:`, err);
    document.getElementById(targetElementId).innerHTML = `<p>Error retrieving weather data. Please try again.</p>`;
  }
}


// ========================= 🔎 Sourcing City Name (from user input, using event handling code) - and applying FetchAndDisplayAllData function =========================
const searchInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-btn");

// Event Listener for Search Button Click
searchButton.addEventListener("click", () => {
  const city = searchInput.value.trim();
  if (city) {
    // for search, we pass the city name and a dummy 0, target element ID, and type 'search'
    fetchAndDisplayAllData(city, 0, 'search-result', 'search');
  }
});

// Event Listener for Enter Key Press
searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        searchButton.click(); // programmatically click the search button
    }
});


// ========================= 🖼️ Weather Data Display Function =========================
function displayWeatherInfo(weatherData, aqiData, targetElementId, fetchType) {
  const weatherDiv = document.getElementById(targetElementId);
  const aqiValue = aqiData.list[0].main.aqi;
  const windSpeed = weatherData.wind.speed;
  const weatherIcon = `http://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`;
  
  // Use a class for static image alignment
  const staticImageClass = fetchType === 'current' ? 'static-image-current' : 'static-image-search';
  
  weatherDiv.innerHTML = `
    <div class="weather-content">
      <h3>${weatherData.name}</h3>
      <p><strong>Temperature:</strong> ${Math.round(weatherData.main.temp)}°C</p>
      <p><strong>Conditions:</strong> ${weatherData.weather[0].description}</p>
      <p><strong>Wind Speed:</strong> ${windSpeed} m/s</p>
      <p><strong>AQI (Air Quality Index):</strong> ${aqiValue} (${aqiStatus[aqiValue]})</p>
      <img src="${weatherIcon}" alt="Weather Icon">
    </div>
    <div class="static-image-container static-${fetchType}"></div>
  `;
  
  initMap(weatherData.coord.lat, weatherData.coord.lon);
}

// ========================= 📅 Forecast Display Function =========================
function displayForecast(data) {
  const forecastDiv = document.getElementById("forecast-cards");
  forecastDiv.innerHTML = "";

  const dailyData = data.list.filter((reading) =>
    reading.dt_txt.includes("12:00:00")
  );

  dailyData.slice(0, 3).forEach((day) => {
    forecastDiv.innerHTML += `
      <div class="forecast-card">
        <p><strong>${new Date(day.dt_txt).toDateString()}</strong></p>
        <p>${Math.round(day.main.temp)}°C</p>
        <p>${day.weather[0].description}</p>
        <img src="http://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="Weather Icon">
      </div>
    `;
  });
}

// ========================= 🗺️ Map (with weather overlay) Display Function =========================
function initMap(lat, lon) {
  if (!map) {
    map = L.map("mapId").setView([lat, lon], 8);

    // Base map tiles (OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    // Weather overlay (Clouds layer from OWM)
    L.tileLayer(
      `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
      { opacity: 0.9, attribution: "Weather data © OpenWeatherMap" }
    ).addTo(map);
  } else {
    map.setView([lat, lon], 8);
  }

  // Add marker for location
  L.marker([lat, lon]).addTo(map);
}

// ========================= 🌙 Dark Mode Toggle Feature =========================
const toggleBtn = document.getElementById("dark-mode-toggle");

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
    toggleBtn.textContent = "☀️ Light Mode";
  } else {
    localStorage.setItem("theme", "light");
    toggleBtn.textContent = "🌙 Dark Mode";
  }
});

// Apply saved theme preferences on load
window.onload = () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    toggleBtn.textContent = "☀️ Light Mode";
  }
};