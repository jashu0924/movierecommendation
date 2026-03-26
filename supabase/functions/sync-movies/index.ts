import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Genre mapping for TMDB preprocessing
const genreMap: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 
  878: "Science Fiction", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
};

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // 1. Fetch from TMDB
    const tmdbKey = '2a664ef3374815347949ca389558ca4c';
    const res = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${tmdbKey}&language=en-US&page=1`);
    const { results } = await res.json();

    // 2. PREPROCESSING (Evidence for Milestone)
    const processedMovies = results.map((m: any) => {
      // Map genre IDs to text
      const genreNames = m.genre_ids.map((id: number) => genreMap[id] || "").join(" ");
      
      // Create the "Search Soup" - Lowercased for consistency
      const soup = `${m.title} ${genreNames} ${m.overview}`.toLowerCase();

      return {
        id: m.id,
        title: m.title,
        overview: m.overview,
        genres: genreNames,
        release_date: m.release_date,
        search_metadata: soup
      };
    });

    // 3. Load into DB
    const { data, error } = await supabase
      .from('movies')
      .upsert(processedMovies, { onConflict: 'id' });

    if (error) throw error;

    return new Response(JSON.stringify({ message: "Sync successful", count: processedMovies.length }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})