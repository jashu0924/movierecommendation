from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return jsonify({"message": "Flask backend is running"})

@app.route("/search", methods=["GET"])
def search():
    query = request.args.get("q", "")

    if not query:
        return jsonify({"error": "Missing search query"}), 400

    # placeholder response for now
    return jsonify({
        "query": query,
        "results": [
            {"title": "Inception"},
            {"title": "Interstellar"}
        ]
    })

if __name__ == "__main__":
    app.run(debug=True)