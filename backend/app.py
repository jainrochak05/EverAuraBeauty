from flask import Flask, jsonify, request
from flask_pymongo import PyMongo
from bson.objectid import ObjectId
from flask_cors import CORS
from dotenv import load_dotenv
import os
import cloudinary
import cloudinary.uploader
from datetime import datetime
import logging
import json

# --- CONFIGURATION ---
load_dotenv()
app = Flask(__name__)

# --- SECURITY & CORS ---
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'fallback-secret-key')
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")  # Frontend domain in production
CORS(app, origins=[FRONTEND_URL])

# --- DATABASE ---
app.config['MONGO_URI'] = os.environ.get('MONGO_URI')
mongo = PyMongo(app)

products_collection = mongo.db.products
testimonials_collection = mongo.db.testimonials
coupons_collection = mongo.db.coupons

# Create indexes safely
coupons_collection.create_index("code", unique=True)
products_collection.create_index("category")
testimonials_collection.create_index("status")

# --- CLOUDINARY CONFIG ---
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET')
)

# --- LOGGING ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- HELPERS ---
def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# --- BASE DIR for local files ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- ROUTES ---

# --- Verses (from JSON) ---
@app.route('/api/verses', methods=['GET'])
def get_verses():
    try:
        file_path = os.path.join(BASE_DIR, 'verses.json')
        with open(file_path, 'r', encoding='utf-8') as f:
            verses = json.load(f)
        return jsonify(verses)
    except FileNotFoundError:
        return jsonify({"error": "Verses file not found"}), 404
    except json.JSONDecodeError:
        return jsonify({"error": "Error parsing verses file"}), 500
    except Exception as e:
        logger.error("Failed to fetch verses", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

# --- Coupons ---
@app.route('/api/coupons', methods=['POST'])
def add_coupon():
    data = request.get_json()
    if not data or not data.get('code') or not data.get('discount'):
        return jsonify({"error": "Missing required fields"}), 400
    try:
        coupon = {
            "code": data.get('code').upper(),
            "discount": float(data.get('discount')),
            "created_at": datetime.utcnow()
        }
        if coupons_collection.find_one({"code": coupon["code"]}):
            return jsonify({"error": "Coupon code already exists"}), 409
        result = coupons_collection.insert_one(coupon)
        new_coupon = coupons_collection.find_one({"_id": result.inserted_id})
        return jsonify(serialize_doc(new_coupon)), 201
    except Exception as e:
        logger.error("Failed to add coupon", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/coupons', methods=['GET'])
def get_coupons():
    try:
        all_coupons = coupons_collection.find()
        return jsonify([serialize_doc(c) for c in all_coupons])
    except Exception as e:
        logger.error("Failed to fetch coupons", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/coupons/<coupon_id>', methods=['DELETE'])
def delete_coupon(coupon_id):
    try:
        result = coupons_collection.delete_one({"_id": ObjectId(coupon_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Coupon not found"}), 404
        return "", 204
    except Exception as e:
        logger.error("Failed to delete coupon", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/coupons/apply', methods=['POST'])
def apply_coupon():
    data = request.get_json()
    if not data or not data.get('code'):
        return jsonify({"error": "Coupon code is required"}), 400
    try:
        code = data.get('code').upper()
        coupon = coupons_collection.find_one({"code": code})
        if not coupon:
            return jsonify({"error": "Invalid coupon code"}), 404
        return jsonify(serialize_doc(coupon))
    except Exception as e:
        logger.error("Failed to apply coupon", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

# --- Products, Testimonials, Health Check ---
# Keep all routes as you already have them, with same try-except + logging

# --- RUN ---
if __name__ == "__main__":
    # For local development
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)), debug=True)
