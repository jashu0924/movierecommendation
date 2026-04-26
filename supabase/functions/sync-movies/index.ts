import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"


// Configuration section, getting API keys etc
const TMDB_API_KEY = '2a664ef3374815347949ca389558ca4c';
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);


// Handler for each HTTP request 
serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  try {
    // scaling database from og ~100 --> >5000
    if (path.endsWith("/sync")) {
      // Populating Database with multiple calls
      const startPage = Number(url.searchParams.get("start")) || 1;
      const pagesToFetch = 25; // sets 25 pages to be pulled per call, gets about 400-500 per call 
      let allMovies = [];

      // Fetch loop --> actually calls TMDB API 25 times to get ~500 movies per call 
      for (let page = startPage; page < startPage + pagesToFetch; page++) {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
        );
        const data = await response.json();
        if (data.results) allMovies.push(...data.results);
      }

      // Remove duplicates and map data to match Supabase table schema w/ 9 columns 
      const seenIds = new Set();
      const moviesToInsert = allMovies
        .filter(m => !seenIds.has(m.id) && seenIds.add(m.id))
        .map(movie => ({
          id: movie.id,
          title: movie.title,
          overview: movie.overview,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          // making sure search_metadata is still populated 
          search_metadata: `${movie.title} ${movie.overview}`.toLowerCase()
        }));

      // updates existing movies or inserts new ones based on 'id'
      const { error } = await supabase.from('movies').upsert(moviesToInsert, { onConflict: 'id' });
      if (error) throw error;


      return new Response(JSON.stringify({ 
        message: `Successfully synced ${moviesToInsert.length} movies!`,
        range: `Pages ${startPage} to ${startPage + pagesToFetch - 1}`
      }), { headers: { "Content-Type": "application/json" } });
    }

    // ACTUAL SEARCH ENGINE 
    // TF-IDF & BM25 PART + VSM for multi model logic
    if (path.endsWith("/search")) {
      
      const query = url.searchParams.get("q");
      // error in query format
      if (!query) return new Response("Error: Missing query parameter 'q'", { status: 400 });

      // call supabase SQL function to get the movies w all 3 models 
      const { data, error } = await supabase
        .rpc('search_movies_weighted', { query_text: query });

      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
    }

    // Response for when we load data so we know how much has pulled/ if there was an error 
    // UI 
    return new Response(
      `API Active. \nTo Sync: /sync?start=1 \nTo Search: /search?q=movie_title`, 
      { status: 200 }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});