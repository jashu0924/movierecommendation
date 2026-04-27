from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv
# Supabase client
from supabase import create_client

load_dotenv()
sb_back = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

@app.route("/")
def home():
    return send_from_directory(app.static_folder, 'oursite.html')

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

if __name__ == "__main__":
    app.run(debug=True)