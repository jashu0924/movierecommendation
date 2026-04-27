const supabaseUrl = "https://ovbnnyrdnispdwvgknvp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92Ym5ueXJkbmlzcGR3dmdrbnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTc3NzAsImV4cCI6MjA5MDEzMzc3MH0.ly2TlJ7zYZ8_BsbRxU-fFbORC3eq7crsjcBM3xYXwFE";
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const userEmail = localStorage.getItem("user_email");

if (!userEmail) {
  window.location.href = "login.html";
}

document.getElementById("user-email").textContent = userEmail;

document.getElementById("user-signout-btn").addEventListener("click", signOut);

async function signOut() {
  await supabaseClient.auth.signOut();

  localStorage.removeItem("user_email");

  window.location.href = "login.html";
}

function creatingmovies(ourmovies, boxid) {
  const container = document.getElementById(boxid);

  container.innerHTML = ourmovies.slice(0, 9).map(m => `
    <div>
      <img src="https://image.tmdb.org/t/p/w200${m.poster_path}" />
      <p>${m.title}</p>
    </div>
  `).join("");
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
    `https://api.themoviedb.org/3/search/movie?api_key=${tmdbk}&query=${query}`
  );

  const data = await myapilink.json();

  creatingmovies(data.results, "finalsearchOut");
}

const searchInput = document.getElementById("search");

searchInput.addEventListener("input", (e) => {
  searchm(e.target.value);
});

lnr();