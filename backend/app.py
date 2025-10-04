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
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")  # Set frontend domain in production
CORS(app, origins=[FRONTEND_URL])

# --- DATABASE ---
app.config['MONGO_URI'] = os.environ.get('MONGO_URI')
mongo = PyMongo(app)

products_collection = mongo.db.products
testimonials_collection = mongo.db.testimonials
coupons_collection = mongo.db.coupons

# --- CREATE INDEXES ---
# Note: In a serverless environment, this will run on every cold start.
# For production, it's often better to create indexes directly in your DB console.
try:
    coupons_collection.create_index("code", unique=True)
    products_collection.create_index("category")
    testimonials_collection.create_index("status")
except Exception as e:
    logging.warning(f"Could not create indexes, may already exist: {e}")


# --- CLOUDINARY CONFIG ---
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET')
)

# --- VERSES JSON ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VERSIONS_FILE = os.path.join(BASE_DIR, "verses.json")
try:
    with open(VERSIONS_FILE, "r", encoding="utf-8") as f:
        verses_data = json.load(f)
except Exception as e:
    verses_data = []
    print("Warning: Could not load verses.json:", e)

# --- LOGGING ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- HELPERS ---
def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# --- ROUTES ---

# --- Root Route (NEW) ---
@app.route('/', methods=['GET'])
def index():
    """Provides a welcome message for the root URL."""
    return jsonify({"message": "Welcome to the Ever-Aura API. Use the /api endpoints to interact."}), 200


# --- Verses ---
@app.route('/api/verses', methods=['GET'])
def get_verses():
    if not verses_data:
        return jsonify({"error": "Verses not found"}), 404
    return jsonify(verses_data)

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
        return jsonify([serialize_doc(c) for c in coupons_collection.find()])
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

# --- Products ---
@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        category = request.args.get('category')
        query = {}
        if category and category != 'all':
            query['category'] = category
        products = products_collection.find(query)
        return jsonify([serialize_doc(p) for p in products])
    except Exception as e:
        logger.error("Failed to fetch products", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/products', methods=['POST'])
def add_product():
    if 'images' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    try:
        file_to_upload = request.files['images']
        upload_result = cloudinary.uploader.upload(file_to_upload, folder="everaura_products")
        image_url = upload_result.get("secure_url")

        new_product = {
            "id": int(request.form.get('id')),
            "name": request.form.get('name'),
            "price": float(request.form.get('price')),
            "category": request.form.get('category'),
            "isTrending": request.form.get('isTrending'),
            "isAntiTarnish": request.form.get('isAntiTarnish'),
            "images": [image_url]
        }
        result = products_collection.insert_one(new_product)
        created_product = products_collection.find_one({"_id": result.inserted_id})
        return jsonify(serialize_doc(created_product)), 201
    except Exception as e:
        logger.error("Failed to add product", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        update_data = request.get_json()
        if '_id' in update_data:
            del update_data['_id']
        result = products_collection.update_one({"_id": ObjectId(product_id)}, {"$set": update_data})
        if result.matched_count == 0:
            return jsonify({"error": "Product not found"}), 404
        updated_product = products_collection.find_one({"_id": ObjectId(product_id)})
        return jsonify(serialize_doc(updated_product))
    except Exception as e:
        logger.error("Failed to update product", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        result = products_collection.delete_one({"_id": ObjectId(product_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Product not found"}), 404
        return "", 204
    except Exception as e:
        logger.error("Failed to delete product", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

# --- Testimonials ---
@app.route('/api/testimonials', methods=['POST'])
def add_testimonial():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('summary'):
        return jsonify({"error": "Missing required fields"}), 400
    try:
        testimonial = {
            "name": data.get('name'),
            "contact": data.get('contact'),
            "summary": data.get('summary'),
            "full_review": data.get('full_review'),
            "status": "pending",
            "submitted_at": datetime.utcnow()
        }
        result = testimonials_collection.insert_one(testimonial)
        new_testimonial = testimonials_collection.find_one({"_id": result.inserted_id})
        return jsonify(serialize_doc(new_testimonial)), 201
    except Exception as e:
        logger.error("Failed to add testimonial", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/testimonials/approved', methods=['GET'])
def get_approved_testimonials():
    try:
        approved = testimonials_collection.find({"status": "approved"})
        return jsonify([serialize_doc(t) for t in approved])
    except Exception as e:
        logger.error("Failed to fetch approved testimonials", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/testimonials/pending', methods=['GET'])
def get_pending_testimonials():
    try:
        pending = testimonials_collection.find({"status": "pending"})
        return jsonify([serialize_doc(t) for t in pending])
    except Exception as e:
        logger.error("Failed to fetch pending testimonials", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/testimonials/<testimonial_id>/approve', methods=['PUT'])
def approve_testimonial(testimonial_id):
    try:
        result = testimonials_collection.update_one(
            {"_id": ObjectId(testimonial_id)},
            {"$set": {"status": "approved"}}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Testimonial not found"}), 404
        return jsonify({"message": "Testimonial approved"}), 200
    except Exception as e:
        logger.error("Failed to approve testimonial", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/testimonials/<testimonial_id>', methods=['DELETE'])
def delete_testimonial(testimonial_id):
    try:
        result = testimonials_collection.delete_one({"_id": ObjectId(testimonial_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Testimonial not found"}), 404
        return "", 204
    except Exception as e:
        logger.error("Failed to delete testimonial", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

# --- Health Check ---
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"}), 200

# --- RUN LOCAL ---
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)), debug=True)
