const token = localStorage.getItem("access_token");
const userEmail = localStorage.getItem("user_email");
const userId = localStorage.getItem("user_id");

if (!token || !userEmail || !userId) {
  window.location.href = "login.html";
}

document.getElementById("user-signout-btn").addEventListener("click", signOut);

function signOut() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_email");
  localStorage.removeItem("user_id");

  window.location.href = "login.html";
}

const params = new URLSearchParams(window.location.search);
const movieId = params.get("id");

if (!movieId) {
  document.getElementById("movie-details").innerHTML = "<p>No movie selected.</p>";
} else {
  loadMovieDetails(movieId);
}

async function loadMovieDetails(movieId) {
  const response = await fetch(`http://127.0.0.1:5000/movie/${movieId}`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  const movie = await response.json();

  if (!response.ok) {
    document.getElementById("movie-details").innerHTML = `
      <p>Error loading movie: ${movie.error}</p>
    `;
    return;
  }

  const genres = movie.genres.map(g => g.name).join(", ");

  document.getElementById("movie-details").innerHTML = `
    <div class="movie-details-layout">
      <img 
        class="movie-details-poster" 
        src="https://image.tmdb.org/t/p/w500${movie.poster_path}" 
        alt="${movie.title}"
      />

      <div class="movie-details-info">
        <h1>${movie.title}</h1>

        <p class="movie-tagline">${movie.tagline || ""}</p>

        <p><strong>Release Date:</strong> ${movie.release_date || "N/A"}</p>
        <p><strong>Rating:</strong> ${movie.vote_average} / 10</p>
        <p><strong>Runtime:</strong> ${movie.runtime} minutes</p>
        <p><strong>Genres:</strong> ${genres}</p>

        <h2>Description</h2>
        <p>${movie.overview || "No description available."}</p>
      </div>
    </div>
  `;
}