//get the saved login/session information from localstorage
const token = localStorage.getItem("access_token");
const userEmail = localStorage.getItem("user_email");
const userId = localStorage.getItem("user_id");

//if anything missing make the user sign in again
if (!token || !userEmail || !userId) {
  window.location.href = "login.html";
}

//connect the sign out button to the sign out function
document.getElementById("user-signout-btn").addEventListener("click", signOut);

//logs the user out by removing the session data
function signOut() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_email");
  localStorage.removeItem("user_id");

  //redirecting user to the login page
  window.location.href = "login.html";
}

//read the movie id from the page url
const params = new URLSearchParams(window.location.search);
const movieId = params.get("id");
//if no movie id in the url show an error
if (!movieId) {
  document.getElementById("movie-details").innerHTML = "<p>No movie selected.</p>";
} else {
  loadMovieDetails(movieId);
}

//getting movie details from the flask backend using the movie id
async function loadMovieDetails(movieId) {
  const response = await fetch(`http://127.0.0.1:5000/movie/${movieId}`, {
    headers: {
      //sends the user's access token so the backend can verify request
      "Authorization": `Bearer ${token}`
    }
  });

  //convert the backend response into a JS object
  const movie = await response.json();

  //error responses
  if (!response.ok) {
    document.getElementById("movie-details").innerHTML = `
      <p>Error loading movie: ${movie.error}</p>
    `;
    return;
  }

  //convert the list of genre objects into one readable string
  const genres = movie.genres.map(g => g.name).join(", ");
  //building movie details for the movie pageusing the data returned from the backend
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

        <button id="like-movie-btn" class="main-btn movie-action-btn">Like Movie</button>
        <p id="like-status" class="status-text"></p>
      </div>
    </div>
  `;
  //after the button is clicked, saves the movie to liked
  document.getElementById("like-movie-btn").addEventListener("click", () => {
    saveMovieLike(movie.id);
  });
}
//sends a POST request to the backend to save the users interaction
async function saveMovieLike(movieId) {
  const status = document.getElementById("like-status");
  status.textContent = "Saving like...";

  try {
    const response = await fetch("http://127.0.0.1:5000/movie-click", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        movie_id: movieId,
        interaction_type: "like",
        score: 3
      })
    });

    const data = await response.json();

    if (!response.ok) {
      status.textContent = `Like was not saved: ${data.error}`;
      return;
    }

    status.textContent = "Saved to your liked movies.";
  } catch (error) {
    status.textContent = "Backend like save failed.";
  }
}
