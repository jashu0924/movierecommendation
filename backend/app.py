from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv
import requests
import math
import re
from collections import Counter
from supabase import create_client

load_dotenv()

SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92Ym5ueXJkbmlzcGR3dmdrbnZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU1Nzc3MCwiZXhwIjoyMDkwMTMzNzcwfQ.yuMJBO-hohy3GMSKZ-Nk1WjX0QKm2KxA_u6Ctc92Vtk"
SUPABASE_URL = "https://ovbnnyrdnispdwvgknvp.supabase.co"
TMDB_API_KEY = "2a664ef3374815347949ca389558ca4c"
sb_back = create_client(SUPABASE_URL, SUPABASE_KEY)
app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)

TOKEN_RE = re.compile(r"[a-z0-9]+")

STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
    "has", "he", "her", "his", "in", "is", "it", "its", "of", "on",
    "or", "that", "the", "their", "this", "to", "was", "with"
}


def get_current_user():
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return None, (jsonify({"error": "Missing authorization token"}), 401)

    token = auth_header.replace("Bearer ", "")

    user_response = sb_back.auth.get_user(token)
    user = user_response.user

    if not user:
        return None, (jsonify({"error": "Invalid user token"}), 401)

    return user, None


def tokenize(text):
    return [
        token for token in TOKEN_RE.findall((text or "").lower())
        if token not in STOP_WORDS and len(token) > 1
    ]


def movie_text(movie):
    return " ".join([
        str(movie.get("title") or ""),
        str(movie.get("overview") or ""),
        str(movie.get("search_metadata") or "")
    ])


def fetch_tmdb_movie(movie_id):
    tmdb_key = "2a664ef3374815347949ca389558ca4c"
    tmdb_url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={tmdb_key}"

    response = requests.get(tmdb_url)
    movie_data = response.json()

    if response.status_code != 200:
        print("TMDB error:", movie_data)
        return None

    return movie_data


def save_or_update_movie_from_tmdb(movie_id):
    """
    Fetches movie data from TMDB and saves/updates it in Supabase.
    This fills poster_path so posters can show on liked/recommended pages.
    """
    try:
        tmdb_movie = fetch_tmdb_movie(movie_id)

        if not tmdb_movie:
            return None

        genres = ", ".join([g["name"] for g in tmdb_movie.get("genres", [])])

        search_metadata = " ".join([
            tmdb_movie.get("title") or "",
            tmdb_movie.get("overview") or "",
            genres
        ])

        movie_row = {
            "id": tmdb_movie.get("id"),
            "title": tmdb_movie.get("title"),
            "overview": tmdb_movie.get("overview"),
            "genres": genres,
            "release_date": tmdb_movie.get("release_date"),
            "vote_average": tmdb_movie.get("vote_average"),
            "search_metadata": search_metadata,
            "poster_path": tmdb_movie.get("poster_path")
        }

        existing = (
            sb_back.table("movies")
            .select("id")
            .eq("id", movie_id)
            .limit(1)
            .execute()
        )

        if existing.data:
            sb_back.table("movies").update(movie_row).eq("id", movie_id).execute()
        else:
            sb_back.table("movies").insert(movie_row).execute()

        return movie_row

    except Exception as e:
        print("Could not save/update movie from TMDB:", e)
        return None


def add_missing_posters_to_movies(movies):
    """
    If a movie from Supabase has no poster_path, fetch it from TMDB,
    save it to Supabase, and attach it to the returned movie object.
    """
    updated_movies = []

    for movie in movies or []:
        if movie.get("poster_path"):
            updated_movies.append(movie)
            continue

        movie_id = movie.get("id")

        if not movie_id:
            movie["poster_path"] = None
            updated_movies.append(movie)
            continue

        tmdb_movie = save_or_update_movie_from_tmdb(movie_id)

        if tmdb_movie and tmdb_movie.get("poster_path"):
            movie["poster_path"] = tmdb_movie.get("poster_path")
        else:
            movie["poster_path"] = None

        updated_movies.append(movie)

    return updated_movies


def tmdb_list_to_movies(tmdb_movies):
    movies = []

    for movie in tmdb_movies or []:
        movies.append({
            "id": movie.get("id"),
            "title": movie.get("title"),
            "overview": movie.get("overview"),
            "release_date": movie.get("release_date"),
            "vote_average": movie.get("vote_average"),
            "poster_path": movie.get("poster_path"),
            "search_metadata": f"{movie.get('title') or ''} {movie.get('overview') or ''}"
        })

    return movies


def fetch_tmdb_popular_movies(limit=20):
    tmdb_key = "2a664ef3374815347949ca389558ca4c"
    tmdb_url = f"https://api.themoviedb.org/3/movie/popular?api_key={tmdb_key}&language=en-US&page=1"

    response = requests.get(tmdb_url)
    data = response.json()

    if response.status_code != 200:
        print("TMDB popular error:", data)
        return []

    return tmdb_list_to_movies(data.get("results", [])[:limit])


def add_popularity_scores(movies):
    for movie in movies:
        vote_average = float(movie.get("vote_average") or 0)
        movie["tfidf_score"] = 0
        movie["bm25_score"] = 0
        movie["final_score"] = round(vote_average / 10, 4)

    return movies


def add_text_scores(query, movies):
    query_terms = tokenize(query)
    docs = [tokenize(movie_text(movie)) for movie in movies]

    if not query_terms or not docs:
        for movie in movies:
            movie["tfidf_score"] = 0
            movie["bm25_score"] = 0
            movie["final_score"] = 0
        return movies

    total_docs = len(docs)
    doc_freq = Counter()

    for terms in docs:
        doc_freq.update(set(terms))

    query_counts = Counter(query_terms)
    avg_doc_len = sum(len(terms) for terms in docs) / max(total_docs, 1)

    k1 = 1.5
    b = 0.75

    raw_tfidf_scores = []
    raw_bm25_scores = []

    for terms in docs:
        term_counts = Counter(terms)
        doc_len = len(terms) or 1

        tfidf = 0
        bm25 = 0

        for term, query_count in query_counts.items():
            df = doc_freq.get(term, 0)

            if df == 0:
                continue

            idf = math.log((total_docs + 1) / (df + 1)) + 1
            tfidf += (term_counts.get(term, 0) / doc_len) * idf * query_count

            bm25_idf = math.log(1 + (total_docs - df + 0.5) / (df + 0.5))
            tf = term_counts.get(term, 0)

            denominator = tf + k1 * (1 - b + b * doc_len / max(avg_doc_len, 1))

            if denominator:
                bm25 += bm25_idf * ((tf * (k1 + 1)) / denominator)

        raw_tfidf_scores.append(tfidf)
        raw_bm25_scores.append(bm25)

    max_tfidf = max(raw_tfidf_scores) or 1
    max_bm25 = max(raw_bm25_scores) or 1

    for i, movie in enumerate(movies):
        tfidf_score = raw_tfidf_scores[i] / max_tfidf
        bm25_score = raw_bm25_scores[i] / max_bm25

        movie["tfidf_score"] = round(tfidf_score, 4)
        movie["bm25_score"] = round(bm25_score, 4)

        movie["final_score"] = round(
            (0.5 * tfidf_score) + (0.4 * bm25_score),
            4
        )

    return movies


def average_precision_at_k(ranked_movies, relevant_movie_ids, k=10):
    if not relevant_movie_ids:
        return 0

    hits = 0
    precision_sum = 0

    for index, movie in enumerate(ranked_movies[:k], start=1):
        if movie["id"] in relevant_movie_ids:
            hits += 1
            precision_sum += hits / index

    return round(precision_sum / min(len(relevant_movie_ids), k), 4)


@app.route("/")
def home():
    return send_from_directory(app.static_folder, "login.html")


@app.route("/<path:filename>")
def serve_frontend(filename):
    return send_from_directory(app.static_folder, filename)


@app.route("/search", methods=["GET"])
def search():
    query = request.args.get("q", "")

    if not query:
        return jsonify({"error": "Missing search query"}), 400

    try:
        tmdb_key = "2a664ef3374815347949ca389558ca4c"

        tmdb_url = (
            f"https://api.themoviedb.org/3/search/movie"
            f"?api_key={tmdb_key}&query={query}"
        )

        response = requests.get(tmdb_url)
        data = response.json()

        if response.status_code != 200:
            return jsonify({"error": "TMDB search failed"}), 400

        results = []

        for movie in data.get("results", [])[:20]:
            results.append({
                "id": movie.get("id"),
                "title": movie.get("title"),
                "overview": movie.get("overview"),
                "release_date": movie.get("release_date"),
                "vote_average": movie.get("vote_average"),
                "poster_path": movie.get("poster_path"),
                "search_metadata": f"{movie.get('title') or ''} {movie.get('overview') or ''}"
            })

        results = add_text_scores(query, results)

        return jsonify({
            "query": query,
            "results": results
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/movie-click", methods=["POST"])
def movie_click():
    data = request.get_json()

    try:
        user, error_response = get_current_user()

        if error_response:
            return error_response

        movie_id = data.get("movie_id")
        interaction_type = data.get("interaction_type", "click")
        score = data.get("score", 1)

        if not movie_id:
            return jsonify({"error": "Missing movie_id"}), 400

        save_or_update_movie_from_tmdb(movie_id)

        sb_back.table("user_interactions").insert({
            "user_id": user.id,
            "movie_id": movie_id,
            "interaction_type": interaction_type,
            "score": score
        }).execute()

        return jsonify({
            "message": "Movie interaction saved",
            "user_id": user.id,
            "movie_id": movie_id,
            "interaction_type": interaction_type,
            "score": score
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/user-history", methods=["GET"])
def user_history():
    try:
        user, error_response = get_current_user()

        if error_response:
            return error_response

        interactions = (
            sb_back.table("user_interactions")
            .select("movie_id, interaction_type, score, created_at")
            .eq("user_id", user.id)
            .order("created_at", desc=True)
            .limit(30)
            .execute()
        )

        movie_ids = list({item["movie_id"] for item in interactions.data or []})
        movies_by_id = {}

        if movie_ids:
            movies = (
                sb_back.table("movies")
                .select("id, title, overview, release_date, poster_path")
                .in_("id", movie_ids)
                .execute()
            )

            movies_data = add_missing_posters_to_movies(movies.data or [])
            movies_by_id = {movie["id"]: movie for movie in movies_data}

        history = []

        for item in interactions.data or []:
            movie = movies_by_id.get(item["movie_id"], {})
            history.append({**item, "movie": movie})

        return jsonify({"history": history}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/recommendations", methods=["GET"])
def recommendations():
    try:
        user, error_response = get_current_user()

        if error_response:
            return error_response

        interactions = (
            sb_back.table("user_interactions")
            .select("movie_id, interaction_type, score")
            .eq("user_id", user.id)
            .order("score", desc=True)
            .limit(25)
            .execute()
        )

        history_ids = list({item["movie_id"] for item in interactions.data or []})

        if not history_ids:
            fallback_results = add_popularity_scores(fetch_tmdb_popular_movies(20))

            return jsonify({
                "profile": "Popular movies until you build history",
                "metrics": {"map_at_10": None},
                "results": fallback_results
            }), 200

        liked_movies = (
            sb_back.table("movies")
            .select("id, title, overview, search_metadata, poster_path")
            .in_("id", history_ids)
            .execute()
        )

        liked_movies_data = add_missing_posters_to_movies(liked_movies.data or [])

        profile = " ".join(movie_text(movie) for movie in liked_movies_data)

        if not profile.strip():
            fallback_results = add_popularity_scores([
                movie for movie in fetch_tmdb_popular_movies(20)
                if movie["id"] not in history_ids
            ])

            return jsonify({
                "profile": "Popular movies until your history has movie details",
                "metrics": {"map_at_10": None},
                "results": fallback_results
            }), 200

        candidates = (
            sb_back.table("movies")
            .select("id, title, overview, release_date, vote_average, search_metadata, poster_path")
            .limit(500)
            .execute()
        )

        candidate_movies = [
            movie for movie in candidates.data or []
            if movie["id"] not in history_ids
        ]

        if not candidate_movies:
            candidate_movies = [
                movie for movie in fetch_tmdb_popular_movies(20)
                if movie["id"] not in history_ids
            ]

        scored_movies = add_text_scores(profile, candidate_movies)

        history_scores = {}

        for item in interactions.data or []:
            history_scores[item["movie_id"]] = (
                history_scores.get(item["movie_id"], 0) + item.get("score", 1)
            )

        for movie in scored_movies:
            interaction_score = min(history_scores.get(movie["id"], 0) / 3, 1)

            movie["interaction_score"] = round(interaction_score, 4)

            movie["final_score"] = round(
                (0.5 * movie["tfidf_score"]) +
                (0.4 * movie["bm25_score"]) +
                (0.1 * interaction_score),
                4
            )

        results = sorted(
            scored_movies,
            key=lambda movie: movie["final_score"],
            reverse=True
        )[:20]

        results = add_missing_posters_to_movies(results)

        profile_terms = {
            term for term, _count in Counter(tokenize(profile)).most_common(15)
        }

        relevant_ids = {
            movie["id"]
            for movie in scored_movies
            if profile_terms.intersection(tokenize(movie_text(movie)))
        }

        map_at_10 = average_precision_at_k(results, relevant_ids, 10)

        return jsonify({
            "profile": " ".join(list(profile_terms)[:12]),
            "metrics": {"map_at_10": map_at_10},
            "results": results
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/movie/<int:movie_id>", methods=["GET"])
def get_movie_details(movie_id):
    user, error_response = get_current_user()

    if error_response:
        return error_response

    try:
        movie_data = fetch_tmdb_movie(movie_id)

        if not movie_data:
            return jsonify({"error": "Could not fetch movie details"}), 400

        save_or_update_movie_from_tmdb(movie_id)

        return jsonify(movie_data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/liked-movies", methods=["GET"])
def liked_movies():
    try:
        user, error_response = get_current_user()

        if error_response:
            return error_response

        interactions = (
            sb_back.table("user_interactions")
            .select("movie_id, score, created_at")
            .eq("user_id", user.id)
            .eq("interaction_type", "like")
            .order("created_at", desc=True)
            .execute()
        )

        movie_ids = list({item["movie_id"] for item in interactions.data or []})

        if not movie_ids:
            return jsonify({"results": []}), 200

        movies = (
            sb_back.table("movies")
            .select("id, title, overview, release_date, vote_average, poster_path")
            .in_("id", movie_ids)
            .execute()
        )

        movies_data = add_missing_posters_to_movies(movies.data or [])

        return jsonify({"results": movies_data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True)
