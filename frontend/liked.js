const token = localStorage.getItem("access_token");
const userEmail = localStorage.getItem("user_email");
const userId = localStorage.getItem("user_id");

if (!token || !userEmail || !userId) {
  window.location.href = "login.html";
}

document.getElementById("user-email").textContent = userEmail;
document.getElementById("user-signout-btn").addEventListener("click", signOut);

function signOut() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_email");
  localStorage.removeItem("user_id");
  window.location.href = "login.html";
}

function renderMovies(movies, boxid) {
  const container = document.getElementById(boxid);
  container.innerHTML = "";

  if (!movies.length) {
    container.innerHTML = "<p class='muted-text'>No liked movies yet.</p>";
    return;
  }

  movies.forEach((m) => {
    const card = document.createElement("div");
    card.classList.add("movie-card");

    const poster = m.poster_path
      ? `https://image.tmdb.org/t/p/w200${m.poster_path}`
      : "https://placehold.co/200x300/151820/c8ff3d?text=Movie";

    card.innerHTML = `
      <img src="${poster}" />
      <p>${m.title}</p>
    `;

    card.addEventListener("click", () => {
      window.location.href = `movie.html?id=${m.id}`;
    });

    container.appendChild(card);
  });
}

async function loadLikedMovies() {
  const response = await fetch("http://127.0.0.1:5000/liked-movies", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    document.getElementById("likedMoviesOut").innerHTML = `<p>${data.error}</p>`;
    return;
  }

  renderMovies(data.results, "likedMoviesOut");
}

loadLikedMovies();