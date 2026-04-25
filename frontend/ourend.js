
function creatingmovies(ourmovies, boxid) {
  const container = document.getElementById(boxid);

//we should have teh api make the movie and the poster now sincve we want to obtain the top x
  container.innerHTML = ourmovies.slice(0,9).map(m => `
    <div><img src="https://image.tmdb.org/t/p/w200${m.poster_path}" />
      <p>${m.title}</p>
    </div>`).join("");
}

const tmdbk = "2a664ef3374815347949ca389558ca4c";
const myapilink = fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${tmdbk}`);


async function lnr() {
//need to obtain new releases to show up
// we wait for the api results to come through and then we can create the movies from the link with the respective boces
  const myapilink = await fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${tmdbk}`);
  const moveioutputs = await myapilink.json();
  //should have all components by here
  creatingmovies(moveioutputs.results, "newReleases");
}

async function searchm(query) {
  if (query == null) return;

  const myapilink = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${tmdbk}&query=${query}`);
  // and then we can get teh movie from th elink and show them in the search results 
  const data = await myapilink.json();
  creatingmovies(data.results, "finalsearchOut");
}

//need the search results to be populated as well
const finalsearchOut = document.getElementById("search");
finalsearchOut.addEventListener("input", (e) => {searchm(e.target.value);})

lnr();