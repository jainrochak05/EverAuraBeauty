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

# --- CONFIGURATION ---
load_dotenv()
app = Flask(__name__)

# --- SECURITY & CORS ---
app.secret_key = os.getenv("SECRET_KEY", "fallback-secret-key")
FRONTEND_URL = os.getenv("FRONTEND_URL")
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}}, # Allow all origins for simplicity
    supports_credentials=True,
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)


@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        headers = response.headers

        headers["Access-Control-Allow-Origin"] = os.getenv("FRONTEND_URL")
        headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
        headers["Access-Control-Allow-Headers"] = request.headers.get(
            "Access-Control-Request-Headers", ""
        )
        return response


# --- DATABASE ---
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
mongo = PyMongo(app)

products_collection = mongo.db.products
testimonials_collection = mongo.db.testimonials
coupons_collection = mongo.db.coupons

# Create indexes (run once)
coupons_collection.create_index("code", unique=True)
products_collection.create_index("category")
testimonials_collection.create_index("status")


# --- CLOUDINARY CONFIG ---
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# --- LOGGING ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- HELPERS ---
def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

def generate_rsn(category, gender, type_, material):
    # Mapping for category digit
    category_map = {
        "Earrings": "1",
        "Bangles/Bracelets": "2",
        "Necklace": "3",
        "Rings": "4"
    }
    # Mapping for gender digit
    gender_map = {
        "Her": "0",
        "Him": "1"
    }
    # type_ and material are expected as integers (0 or 1 etc.)
    # Material mapping for clarity (not needed for generation, but for validation)
    material_map = {
        0: "0",
        1: "1",
        2: "2",
        3: "3",
        4: "4"
    }

    cat_digit = category_map.get(category, "0")
    gender_digit = gender_map.get(gender, "0")
    type_digit = str(type_) if type_ in [0,1] else "0"
    material_digit = material_map.get(material, "0")

    # Find last used article number for this combination (category + type)
    prefix = cat_digit + type_digit
    # Query for products with rsn starting with prefix
    last_product = products_collection.find(
        {"rsn": {"$regex": f"^{prefix}"}}
    ).sort("rsn", -1).limit(1)
    last_number = 0
    for prod in last_product:
        rsn_str = prod.get("rsn", "")
        if len(rsn_str) == 6:
            try:
                last_number = int(rsn_str[-4:])
            except:
                last_number = 0
    next_number = last_number + 1
    next_number_str = str(next_number).zfill(4)

    rsn = cat_digit + gender_digit + type_digit + material_digit + next_number_str
    return rsn


# --- ROUTES ---

@app.route('/')
def index():
    return jsonify({
        "status": "Backend live on Vercel ✅",
        "allowed_origin": FRONTEND_URL
    })





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


# --- Products ---
@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        category = request.args.get('category')
        gender = request.args.get('gender')
        product_type = request.args.get('type')

        query = {}
        if category and category != 'all':
            query['category'] = category
        if gender:
            query['gender'] = gender # '0' for Her, '1' for Him
        if product_type:
             # Convert to integer for querying
            query['type'] = int(product_type) # 0 for Anti-Tarnish, 1 for Jewelry

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

        # Extract form fields
        id_val = int(request.form.get('id'))
        name = request.form.get('name')
        price = float(request.form.get('price'))
        category = request.form.get('category')
        gender = request.form.get('gender')
        type_str = request.form.get('type')
        material_str = request.form.get('material')
        rsn = request.form.get('rsn')
        description = request.form.get('description')

        # Convert type and material to integers if possible
        try:
            type_int = int(type_str)
        except:
            type_int = 0
        try:
            material_int = int(material_str)
        except:
            material_int = 0

        # Generate RSN if not provided or empty
        if not rsn or rsn.strip() == "":
            rsn = generate_rsn(category, gender, type_int, material_int)

        new_product = {
            "id": id_val,
            "name": name,
            "price": price,
            "category": category,
            "gender": gender,
            "type": type_int,
            "material": material_int,
            "rsn": rsn,
            "description": description,
            "isTrending": request.form.get('isTrending'),
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


# --- New: Get all testimonials (approved and pending) ---
@app.route('/api/testimonials', methods=['GET'])
def get_all_testimonials():
    try:
        testimonials = testimonials_collection.find()
        result = []
        for t in testimonials:
            # Only include selected fields
            obj = {
                "_id": str(t.get("_id")),
                "name": t.get("name"),
                "summary": t.get("summary"),
                "full_review": t.get("full_review"),
                "status": t.get("status"),
                "submitted_at": t.get("submitted_at"),
            }
            result.append(obj)
        return jsonify(result)
    except Exception as e:
        logger.error("Failed to fetch all testimonials", exc_info=True)
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


# --- HEALTH CHECK ---
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"}), 200
