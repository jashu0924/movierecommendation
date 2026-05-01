const supabaseUrl = "https://ovbnnyrdnispdwvgknvp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92Ym5ueXJkbmlzcGR3dmdrbnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTc3NzAsImV4cCI6MjA5MDEzMzc3MH0.ly2TlJ7zYZ8_BsbRxU-fFbORC3eq7crsjcBM3xYXwFE";
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const userEmail = localStorage.getItem("user_email");
const token = localStorage.getItem("access_token");
const userId = localStorage.getItem("user_id");

if (!userEmail) {
  window.location.href = "login.html";
}

if (!token) {
  window.location.href = "login.html";
}
document.getElementById("user-email").textContent = userEmail;

document.getElementById("user-signout-btn").addEventListener("click", signOut);

async function signOut() {
  await supabaseClient.auth.signOut();
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_email");
  localStorage.removeItem("user_id");

  window.location.href = "login.html";
}

function creatingmovies(ourmovies, boxid) {
  const container = document.getElementById(boxid);

  container.innerHTML = "";

  ourmovies.slice(0, 9).forEach((m) => {
    const card = document.createElement("div");
    card.classList.add("movie-card");
    const poster = m.poster_path
      ? `https://image.tmdb.org/t/p/w200${m.poster_path}`
      : "https://placehold.co/200x300/151820/c8ff3d?text=Movie";
    const scoreHtml = typeof m.tfidf_score === "number"
      ? `
        <div class="score-row">
          <span>TF-IDF ${m.tfidf_score.toFixed(2)}</span>
          <span>BM25 ${m.bm25_score.toFixed(2)}</span>
        </div>
        <p class="final-score">Final ${m.final_score.toFixed(2)}</p>
      `
      : "";

    card.innerHTML = `
      <img src="${poster}" />
      <p>${m.title}</p>
      ${scoreHtml}
    `;

    card.addEventListener("click", () => {
      movieClicked(m.id, m.title);
    });

    container.appendChild(card);
  });
}
async function movieClicked(movieId, title) {
  console.log("Clicked:", movieId, title);

  try {
    const response = await fetch("http://127.0.0.1:5000/movie-click", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        movie_id: movieId,
        interaction_type: "click",
        score: 1
      })
    });

    const data = await response.json();
    console.log(data);

    if (!response.ok) {
      console.log("Click was not saved:", data.error);
    }

  } catch (error) {
    console.log("Backend click save failed:", error);
  }

  window.location.href = `movie.html?id=${movieId}`;
}

const tmdbk = "2a664ef3374815347949ca389558ca4c";

async function lnr() {
  const myapilink = await fetch(
    `https://api.themoviedb.org/3/movie/now_playing?api_key=${tmdbk}`
  );

  const moveioutputs = await myapilink.json();

  creatingmovies(moveioutputs.results, "newReleases");
}

async function searchm(query) {
  if (!query) {
    document.getElementById("finalsearchOut").innerHTML = "";
    return;
  }

  const myapilink = await fetch(
    `http://127.0.0.1:5000/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    }
  );

  const data = await myapilink.json();

  creatingmovies(data.results, "finalsearchOut");
}

async function loadRecommendations() {
  const response = await fetch("http://127.0.0.1:5000/recommendations", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    document.getElementById("recommendations").innerHTML = `<p>${data.error}</p>`;
    return;
  }

  document.getElementById("recommendationProfile").textContent = data.profile
    ? `Profile terms: ${data.profile}`
    : "Click or like movies to build your recommendation profile.";
  const mapScore = data.metrics.map_at_10;
  document.getElementById("mapScore").textContent =
    mapScore === null ? "N/A" : Number(mapScore).toFixed(2);
  creatingmovies(data.results, "recommendations");
}

async function loadHistory() {
  const response = await fetch("http://127.0.0.1:5000/user-history", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  const data = await response.json();
  const historyOut = document.getElementById("historyOut");

  if (!response.ok) {
    historyOut.innerHTML = `<p>${data.error}</p>`;
    return;
  }

  if (!data.history.length) {
    historyOut.innerHTML = "<p>No history yet.</p>";
    return;
  }

  historyOut.innerHTML = data.history.slice(0, 8).map((item) => `
    <div class="history-item">
      <strong>${item.movie.title || `Movie ${item.movie_id}`}</strong>
      <span>${item.interaction_type} - score ${item.score}</span>
    </div>
  `).join("");
}

const searchInput = document.getElementById("search");

searchInput.addEventListener("input", (e) => {
  searchm(e.target.value);
});

lnr();
loadRecommendations();
loadHistory();
