from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)

# GitHub Pages frontend domain
allowed_origin = "https://jainrochak05.github.io"

# Enable CORS for your repo’s site (subpath doesn't need to match)
CORS(app, origins=[allowed_origin], supports_credentials=True)

@app.route('/')
def home():
    return jsonify({
        "message": "Flask backend working on Vercel ✅",
        "allowed_origin": allowed_origin
    })

@app.route('/api/products')
def products():
    return jsonify([
        {"id": 1, "name": "Lip Balm"},
        {"id": 2, "name": "Face Serum"}
    ])
