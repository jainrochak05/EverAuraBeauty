from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)

CORS(app, origins=["https://jainrochak05.github.io"])

@app.route('/')
def home():
    return jsonify({"message": "Backend live on Vercel", "CORS": "ok"})

@app.route('/api/products')
def products():
    return jsonify([
        {"id": 1, "name": "Serum"},
        {"id": 2, "name": "Moisturizer"}
    ])
