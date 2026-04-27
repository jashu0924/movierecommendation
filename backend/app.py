from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv
import requests
# Supabase client
from supabase import create_client

load_dotenv()
sb_back = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

@app.route("/")
def home():
    return send_from_directory(app.static_folder, 'login.html')

@app.route("/search", methods=["GET"])
def search():
    query = request.args.get("q", "")

    if not query:
        return jsonify({"error": "Missing search query"}), 400

    r = (
        sb_back.table("movies")
        .select("id, title, overview, genres, release_date")
        .ilike("search_metadata", f"%{query}%")
        .limit(20)
        .execute()
    )
    return jsonify({"query": query, "results": r.data})


@app.route("/movie-click", methods=["POST"])
def movie_click():
    data = request.get_json()

    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return jsonify({"error": "Missing authorization token"}), 401

    token = auth_header.replace("Bearer ", "")

    try:
        # get the logged-in user from the Supabase access token
        user_response = sb_back.auth.get_user(token)
        user = user_response.user

        if not user:
            return jsonify({"error": "Invalid user token"}), 401

        movie_id = data.get("movie_id")
        interaction_type = data.get("interaction_type", "click")
        score = data.get("score", 1)

        if not movie_id:
            return jsonify({"error": "Missing movie_id"}), 400

        sb_back.table("user_interactions").insert({
            "user_id": user.id,
            "movie_id": movie_id,
            "interaction_type": interaction_type,
            "score": score
        }).execute()

        return jsonify({
            "message": "Movie click saved",
            "user_id": user.id,
            "movie_id": movie_id,
            "score": score
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/movie/<int:movie_id>", methods=["GET"])
def get_movie_details(movie_id):
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return jsonify({"error": "Missing authorization token"}), 401

    token = auth_header.replace("Bearer ", "")

    try:
        # verify logged-in user
        user_response = sb_back.auth.get_user(token)
        user = user_response.user

        if not user:
            return jsonify({"error": "Invalid user token"}), 401

        tmdb_key = os.environ["TMDB_API_KEY"]

        tmdb_url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={tmdb_key}"

        response = requests.get(tmdb_url)
        movie_data = response.json()

        if response.status_code != 200:
            return jsonify({"error": "Could not fetch movie details"}), 400

        return jsonify(movie_data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400
if __name__ == "__main__":
    app.run(debug=True)