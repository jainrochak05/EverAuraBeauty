import os
import smtplib
import random
import string
import hmac
import hashlib
import razorpay
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, jsonify, request
from pymongo import MongoClient
from flask_cors import CORS
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, JWTManager
from bson.objectid import ObjectId
from dotenv import load_dotenv
import logging

# --- CONFIGURATION ---
load_dotenv()
app = Flask(__name__)

# --- Load Environment Variables ---
MONGO_URI_MAIN = os.getenv("MONGO_URI_MAIN")
MONGO_URI_ORDERS = os.getenv("MONGO_URI_ORDERS")
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET")
# When set to "true" (case-insensitive), the backend will bypass Razorpay and mark orders as paid for testing.
SKIP_PAYMENT = os.getenv("SKIP_PAYMENT", "false").lower() == "true"
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL")
FRONTEND_URL = os.getenv("FRONTEND_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
ADMIN_KEY = os.getenv("ADMIN_KEY")

# --- App Configuration ---
app.config["JWT_SECRET_KEY"] = SECRET_KEY
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=10)

# --- Initialize Extensions ---
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
jwt = JWTManager(app)
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# --- Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Database Setup (Robust Version) ---
try:
    # Connect to Main DB (Products, Coupons, etc.)
    client_main = MongoClient(MONGO_URI_MAIN)
    db_main = client_main.get_default_database()
    products_collection = db_main.products
    testimonials_collection = db_main.testimonials
    coupons_collection = db_main.coupons

    # Connect to Orders DB (Users, Orders)
    client_orders = MongoClient(MONGO_URI_ORDERS)
    db_orders = client_orders.get_default_database()
    users_collection = db_orders.users
    orders_collection = db_orders.orders

    # Create Indexes
    users_collection.create_index("email", unique=True)
    orders_collection.create_index("user_id")
    orders_collection.create_index("order_id", unique=True)
    products_collection.create_index("category")
    testimonials_collection.create_index("status")
    coupons_collection.create_index("code", unique=True)
    
    logger.info("Successfully connected to both MongoDB databases.")

except Exception as e:
    logger.critical(f"CRITICAL: Failed to connect to MongoDB. App will not work. Error: {e}")
    # Set to None so app can at least start, but routes will fail
    products_collection = None 
    testimonials_collection = None
    coupons_collection = None
    users_collection = None
    orders_collection = None

# --- HELPERS ---

def serialize_doc(doc):
    """Converts MongoDB doc to JSON-serializable format."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    if doc and "user_id" in doc:
        doc["user_id"] = str(doc["user_id"])
    return doc

def send_email(to_email, subject, html_body):
    """Sends an email using Gmail SMTP."""
    if not EMAIL_USER or not EMAIL_PASS:
        logger.error("Email credentials (EMAIL_USER, EMAIL_PASS) not set.")
        return False
    
    # This function will now raise exceptions on failure, to be caught by the route
    msg = MIMEMultipart()
    msg['From'] = f"Everaura Beauty <{EMAIL_USER}>"
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_body, 'html'))

    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASS)
        server.send_message(msg)
    logger.info(f"Email sent to {to_email} with subject: {subject}")
    return True

def generate_otp():
    """Generates a 6-digit numeric OTP."""
    return "".join(random.choices(string.digits, k=6))

def check_admin_key():
    """Decorator to check for X-ADMIN-KEY header."""
    admin_key_from_header = request.headers.get('X-ADMIN-KEY')
    if not admin_key_from_header or admin_key_from_header != ADMIN_KEY:
        return jsonify({"error": "Unauthorized admin access"}), 403
    return None

# --- AUTHENTICATION ROUTES ---

@app.route('/api/auth/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({"error": "Email is required"}), 400

    email = email.lower().strip()
    otp = generate_otp()
    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

    try:
        if users_collection is None:
            raise Exception("Orders database is not connected.")
        users_collection.update_one(
            {"email": email},
            {"$set": {"otp": otp, "otp_expiry": otp_expiry, "email": email}},
            upsert=True
        )
    except Exception as e:
        logger.critical(f"CRITICAL: MongoDB operation failed in send_otp. Check MONGO_URI_ORDERS. Error: {e}")
        return jsonify({"error": "Database service is currently unavailable."}), 500

    subject = "Your Everaura Login OTP"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Everaura Beauty Login</h2>
        <p>Your One-Time Password (OTP) to log in is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">{otp}</p>
        <p>This OTP is valid for 10 minutes. Please do not share it with anyone.</p>
        <p>If you did not request this, please ignore this email.</p>
        <br>
        <p>Thank you,<br>The Everaura Team</p>
    </div>
    """
    
    try:
        if send_email(email, subject, html_body):
            return jsonify({"success": True, "message": "OTP sent to your email."})
        else:
            # This should not be reachable if EMAIL_USER/PASS are set, but as a fallback
            return jsonify({"error": "Email service is not configured."}), 500
    except Exception as e:
        # This catches smtplib errors (e.g., wrong password, auth failure)
        logger.critical(f"CRITICAL: SMTP operation failed in send_otp. Check EMAIL_USER/EMAIL_PASS. Error: {e}")
        return jsonify({"error": "Failed to send OTP. Check email credentials."}), 500

@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    email = data.get('email', '').lower().strip()
    otp_attempt = data.get('otp')

    if not email or not otp_attempt:
        return jsonify({"error": "Email and OTP are required"}), 400

    try:
        user = users_collection.find_one({"email": email})
        if not user:
            return jsonify({"error": "User not found"}), 404

        if user.get('otp') != otp_attempt:
            return jsonify({"error": "Invalid OTP"}), 400

        expiry = user.get('otp_expiry')
        if not expiry:
            return jsonify({"error": "OTP not generated"}), 400

        # ✅ Handle both naive and aware datetimes
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)

        if datetime.now(timezone.utc) > expiry:
            return jsonify({"error": "OTP has expired"}), 400

        # ✅ Create JWT token before modifying the DB
        access_token = create_access_token(
            identity=str(user['_id']), 
            additional_claims={"email": user['email']}
        )

        # ✅ Clear OTP after successful verification
        users_collection.update_one(
            {"email": email},
            {"$unset": {"otp": "", "otp_expiry": ""}}
        )

        return jsonify({
            "success": True,
            "message": "Login successful",
            "token": access_token,
            "user": {"email": user['email'], "id": str(user['_id'])}
        })

    except Exception as e:
        import traceback
        logger.error(f"DB Error verify-otp: {e}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
# ... (All other routes remain the same) ...

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "id": str(user['_id']),
        "email": user.get('email'),
        "name": user.get('name'),
        "phone": user.get('phone'),
        "address": user.get('address'),
        "city": user.get('city'),
        "pincode": user.get('pincode')
    })

# --- ORDER & CHECKOUT ROUTES ---

@app.route('/api/orders/create', methods=['POST'])
@jwt_required()
def create_order():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # 1. Validate input data
    required_fields = ['items', 'shipping_address']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required order data"}), 400
    
    items = data['items']
    shipping_address = data['shipping_address']
    coupon_code = data.get('coupon_code')
    
    if not items:
        return jsonify({"error": "Cart cannot be empty"}), 400
    if not all(k in shipping_address for k in ['name', 'phone', 'email', 'address', 'city', 'pincode']):
        return jsonify({"error": "Incomplete shipping address"}), 400

    try:
        # 2. Update user's address info
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "name": shipping_address['name'],
                "phone": shipping_address['phone'],
                "address": shipping_address['address'],
                "city": shipping_address['city'],
                "pincode": shipping_address['pincode']
            }}
        )

        # 3. Calculate totals
        subtotal = sum(item['price'] * item['quantity'] for item in items)
        discount_percent = 0
        discount_amount = 0

        if coupon_code:
            coupon = coupons_collection.find_one({"code": coupon_code.upper()})
            if coupon:
                discount_percent = coupon.get('discount', 0)
                discount_amount = (subtotal * discount_percent) / 100

        total = subtotal - discount_amount
        
        # 4. Create Order document
        order_id_str = f"EA-{int(datetime.now().timestamp() * 1000)}"
        order_doc = {
            "order_id": order_id_str,
            "user_id": ObjectId(user_id),
            "items": items,
            "shipping_address": shipping_address,
            "status": "Pending", # Status: Pending -> Paid -> Packaging -> Shipped -> Delivered -> Cancelled
            "created_at": datetime.now(timezone.utc),
            "subtotal": subtotal,
            "coupon_code": coupon_code,
            "discount_percent": discount_percent,
            "discount_amount": discount_amount,
            "total_amount": total,
            "payment_status": "Pending",
            "payment_link_id": None,
            "payment_id": None,
            "tracking_link": None
        }
    
        result = orders_collection.insert_one(order_doc)
        order_mongo_id = result.inserted_id
    except Exception as e:
        logger.error(f"Failed to insert order/update user: {e}")
        return jsonify({"error": "Failed to create order in database"}), 500

    # 5. Generate Payment (Razorpay or Skip for testing)
    try:
        # If SKIP_PAYMENT flag is enabled or Razorpay keys are not configured, mark as paid (testing mode)
        if SKIP_PAYMENT or not (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET):
            orders_collection.update_one(
                {"_id": order_mongo_id},
                {"$set": {
                    "payment_status": "Paid",
                    "status": "Paid",
                    "payment_id": "TEST_PAYMENT_" + str(order_mongo_id),
                    "paid_at": datetime.now(timezone.utc)
                }}
            )

            # Optionally send confirmation email (same as webhook flow)
            subject = f"Your Everaura Order is Confirmed! (ID: {order_id_str})"
            html_body = f"""
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Thank you for your purchase, {shipping_address['name']}!</h2>
                <p>Your order <strong>(ID: {order_id_str})</strong> has been created and marked as paid for testing purposes.</p>
                <h3>Order Summary:</h3>
                <ul>
                    {"".join([f"<li>{item['name']} (x{item['quantity']}) - ₹{item['price'] * item['quantity']:.2f}</li>" for item in items])}
                </ul>
                <p><strong>Total Paid: ₹{total:.2f}</strong></p>
                <a href="{FRONTEND_URL}/my-orders.html?order_id={order_id_str}" style="display: inline-block; padding: 10px 15px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View My Orders</a>
                <br><br>
                <p>Thank you,<br>The Everaura Team</p>
            </div>
            """
            try:
                send_email(shipping_address['email'], subject, html_body)
            except Exception as e:
                logger.error(f"Test payment: confirmation email failed for order {order_id_str}: {e}")

            return jsonify({
                "success": True,
                "message": "Order created and marked as paid (testing mode).",
                "order_id": order_id_str,
                "payment_url": f"{FRONTEND_URL}/my-orders.html?order_id={order_id_str}"
            })

        # Otherwise create a Razorpay payment link as normal
        link_data = {
            "amount": int(total * 100),  # Amount in paise
            "currency": "INR",
            "accept_partial": False,
            "description": f"Payment for Everaura Order {order_id_str}",
            "customer": {
                "name": shipping_address['name'],
                "email": shipping_address['email'],
                "contact": shipping_address['phone']
            },
            "notify": {
                "sms": True,
                "email": True
            },
            "reminder_enable": True,
            "callback_url": f"{FRONTEND_URL}/my-orders.html?order_id={order_id_str}",
            "callback_method": "get"
        }
        payment_link = razorpay_client.payment_link.create(link_data)

        # 6. Update order with payment link ID
        orders_collection.update_one(
            {"_id": order_mongo_id},
            {"$set": {
                "payment_link_id": payment_link['id'],
                "razorpay_short_url": payment_link['short_url']
            }}
        )

        return jsonify({
            "success": True,
            "message": "Order created, redirecting to payment.",
            "order_id": order_id_str,
            "payment_url": payment_link['short_url']
        })

    except Exception as e:
        logger.error(f"Razorpay link creation failed: {e}")
        # Delete the order if payment link fails
        orders_collection.delete_one({"_id": order_mongo_id})
        return jsonify({"error": f"Failed to create payment link: {e}"}), 500

@app.route('/api/payment/webhook', methods=['POST'])
def payment_webhook():
    data = request.get_json()
    signature = request.headers.get('X-Razorpay-Signature')
    
    if not signature:
        return jsonify({"error": "No signature"}), 400
        
    # 1. Verify webhook signature
    try:
        hmac.compare_digest(
            hmac.new(
                RAZORPAY_WEBHOOK_SECRET.encode('utf-8'),
                request.data,
                hashlib.sha256
            ).hexdigest(),
            signature
        )
    except Exception as e:
        logger.error(f"Webhook signature verification failed: {e}")
        return jsonify({"error": "Invalid signature"}), 400

    # 2. Process the event
    event = data.get('event')
    if event == 'payment_link.paid':
        payload = data.get('payload', {}).get('payment_link', {}).get('entity', {})
        payment_link_id = payload.get('id')
        payment_id = data.get('payload', {}).get('payment', {}).get('entity', {}).get('id')
        
        if not payment_link_id:
            return jsonify({"status": "ok", "message": "No payment_link_id in payload"}), 200

        # 3. Find and update the order
        order = orders_collection.find_one_and_update(
            {"payment_link_id": payment_link_id},
            {"$set": {
                "payment_status": "Paid",
                "status": "Paid", # Set initial status to "Paid"
                "payment_id": payment_id,
                "paid_at": datetime.now(timezone.utc)
            }},
            return_document=True
        )

        if order:
            # 4. Send confirmation email
            subject = f"Your Everaura Order is Confirmed! (ID: {order['order_id']})"
            html_body = f"""
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Thank you for your purchase, {order['shipping_address']['name']}!</h2>
                <p>Your payment has been successfully processed and your order <strong>(ID: {order['order_id']})</strong> is confirmed.</p>
                <p>We will notify you again once your order has been shipped.</p>
                <h3>Order Summary:</h3>
                <ul>
                    {"".join([f"<li>{item['name']} (x{item['quantity']}) - ₹{item['price'] * item['quantity']:.2f}</li>" for item in order['items']])}
                </ul>
                <p><strong>Total Paid: ₹{order['total_amount']:.2f}</strong></p>
                <p>You can track your order status on your "My Orders" page:</p>
                <a href="{FRONTEND_URL}/my-orders.html" style="display: inline-block; padding: 10px 15px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View My Orders</a>
                <br><br>
                <p>Thank you,<br>The Everaura Team</p>
            </div>
            """
            try:
                send_email(order['shipping_address']['email'], subject, html_body)
                logger.info(f"Order {order['order_id']} marked as Paid. Confirmation email sent.")
            except Exception as e:
                logger.error(f"Order {order['order_id']} paid, but confirmation email failed: {e}")
        else:
            logger.warning(f"Paid payment_link_id {payment_link_id} received, but no matching order found.")

    return jsonify({"status": "ok"}), 200

@app.route('/api/orders/my-orders', methods=['GET'])
@jwt_required()
def get_my_orders():
    user_id = get_jwt_identity()
    orders = orders_collection.find({"user_id": ObjectId(user_id)}).sort("created_at", -1)
    return jsonify([serialize_doc(order) for order in orders])

# --- ADMIN ROUTES (Orders) ---

@app.route('/api/admin/orders', methods=['GET'])
def get_admin_orders():
    auth_error = check_admin_key()
    if auth_error: return auth_error
    
    orders = orders_collection.find().sort("created_at", -1)
    return jsonify([serialize_doc(order) for order in orders])

@app.route('/api/admin/orders/<order_id>/update-status', methods=['PUT'])
def update_order_status(order_id):
    auth_error = check_admin_key()
    if auth_error: return auth_error
    
    data = request.get_json()
    new_status = data.get('status')
    if not new_status:
        return jsonify({"error": "New status is required"}), 400

    order = orders_collection.find_one_and_update(
        {"order_id": order_id},
        {"$set": {"status": new_status}},
        return_document=True
    )

    if order:
        # Send status update email
        subject = f"Your Everaura Order Status: {new_status} (ID: {order['order_id']})"
        body = f"""
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <p>Hi {order['shipping_address']['name']},</p>
            <p>The status of your order <strong>(ID: {order['order_id']})</strong> has been updated to: <strong>{new_status}</strong>.</p>
        """
        
        if new_status == "Shipped" and order.get('tracking_link'):
            body += f"<p>You can track your package here:</p>"
            if "indiapost.gov.in" in order['tracking_link']:
                body += f"<a href='{order['tracking_link']}' style='display: inline-block; padding: 10px 15px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;'>Track with India Post</a>"
            else:
                body += f"<a href='{order['tracking_link']}' style='display: inline-block; padding: 10px 15px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;'>Track Package</a>"
        
        body += f"""
            <br><br>
            <p>Thank you,<br>The Everaura Team</p>
        </div>
        """
        try:
            send_email(order['shipping_address']['email'], subject, body)
            logger.info(f"Status update email sent for order {order['order_id']}")
        except Exception as e:
            logger.error(f"Failed to send status update email for order {order['order_id']}: {e}")
            
        return jsonify(serialize_doc(order))
    else:
        return jsonify({"error": "Order not found"}), 404

@app.route('/api/admin/orders/<order_id>/add-tracking', methods=['PUT'])
def add_tracking(order_id):
    auth_error = check_admin_key()
    if auth_error: return auth_error
    
    data = request.get_json()
    tracking_link = data.get('tracking_link')
    if not tracking_link:
        return jsonify({"error": "Tracking link is required"}), 400

    order = orders_collection.find_one_and_update(
        {"order_id": order_id},
        {"$set": {"tracking_link": tracking_link}},
        return_document=True
    )

    if order:
        # If status is "Shipped", send notification with link
        if order['status'] == 'Shipped':
            subject = f"Your Everaura Order Has Shipped! (ID: {order['order_id']})"
            body = f"""
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <p>Hi {order['shipping_address']['name']},</p>
                <p>Good news! Your order <strong>(ID: {order['order_id']})</strong> has shipped.</p>
                <p>You can track your package here:</p>
            """
            if "indiapost.gov.in" in tracking_link:
                body += f"<a href='{tracking_link}' style='display: inline-block; padding: 10px 15px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;'>Track with India Post</a>"
            else:
                 body += f"<a href='{tracking_link}' style='display: inline-block; padding: 10px 15px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;'>Track Package</a>"
            body += f"""
                <br><br>
                <p>Thank you,<br>The Everaura Team</p>
            </div>
            """
            try:
                send_email(order['shipping_address']['email'], subject, body)
                logger.info(f"Tracking email sent for order {order['order_id']}")
            except Exception as e:
                logger.error(f"Failed to send tracking email for order {order['order_id']}: {e}")
            
        return jsonify(serialize_doc(order))
    else:
        return jsonify({"error": "Order not found"}), 404

# --- EXISTING CONTENT ROUTES (Modified with Admin Auth) ---

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
            query['type'] = int(product_type) # 0 for Anti-Tarnish, 1 for Jewelry

        products = products_collection.find(query)
        return jsonify([serialize_doc(p) for p in products])
    except Exception as e:
        logger.error(f"Failed to fetch products: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/products', methods=['POST'])
def add_product():
    auth_error = check_admin_key()
    if auth_error: return auth_error
    
    if 'images' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    try:
        file_to_upload = request.files['images']
        upload_result = cloudinary.uploader.upload(file_to_upload, folder="everaura_products")
        image_url = upload_result.get("secure_url")

        id_val = int(request.form.get('id'))
        name = request.form.get('name')
        price = float(request.form.get('price'))
        category = request.form.get('category')
        gender = request.form.get('gender')
        type_int = int(request.form.get('type', 0))
        material_int = int(request.form.get('material', 0))
        rsn = request.form.get('rsn')
        description = request.form.get('description')
        isTrending = request.form.get('isTrending')
        
        new_product = {
            "id": id_val, "name": name, "price": price, "category": category,
            "gender": gender, "type": type_int, "material": material_int,
            "rsn": rsn, "description": description, "isTrending": isTrending,
            "images": [image_url]
        }
        result = products_collection.insert_one(new_product)
        created_product = products_collection.find_one({"_id": result.inserted_id})
        return jsonify(serialize_doc(created_product)), 201
    except Exception as e:
        logger.error(f"Failed to add product: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    auth_error = check_admin_key()
    if auth_error: return auth_error
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
        logger.error(f"Failed to update product: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    auth_error = check_admin_key()
    if auth_error: return auth_error
    try:
        result = products_collection.delete_one({"_id": ObjectId(product_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Product not found"}), 404
        return "", 204
    except Exception as e:
        logger.error(f"Failed to delete product: {e}")
        return jsonify({"error": "Internal server error"}), 500

# --- Testimonials ---
@app.route('/api/testimonials', methods=['POST'])
def add_testimonial():
    # No auth needed, this is public
    data = request.get_json()
    if not data or not data.get('name') or not data.get('summary'):
        return jsonify({"error": "Missing required fields"}), 400
    try:
        testimonial = {
            "name": data.get('name'), "contact": data.get('contact'),
            "summary": data.get('summary'), "full_review": data.get('full_review'),
            "status": "pending", "submitted_at": datetime.now(timezone.utc)
        }
        result = testimonials_collection.insert_one(testimonial)
        new_testimonial = testimonials_collection.find_one({"_id": result.inserted_id})
        return jsonify(serialize_doc(new_testimonial)), 201
    except Exception as e:
        logger.error(f"Failed to add testimonial: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/testimonials', methods=['GET'])
def get_all_testimonials():
    # This is for admin, so add auth
    auth_error = check_admin_key()
    if auth_error: return auth_error
    try:
        testimonials = testimonials_collection.find().sort("submitted_at", -1)
        return jsonify([serialize_doc(t) for t in testimonials])
    except Exception as e:
        logger.error(f"Failed to fetch all testimonials: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/testimonials/approved', methods=['GET'])
def get_approved_testimonials():
    # Public route
    try:
        approved = testimonials_collection.find({"status": "approved"})
        return jsonify([serialize_doc(t) for t in approved])
    except Exception as e:
        logger.error(f"Failed to fetch approved testimonials: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/testimonials/<testimonial_id>/approve', methods=['PUT'])
def approve_testimonial(testimonial_id):
    auth_error = check_admin_key()
    if auth_error: return auth_error
    try:
        result = testimonials_collection.update_one(
            {"_id": ObjectId(testimonial_id)},
            {"$set": {"status": "approved"}}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Testimonial not found"}), 404
        return jsonify({"message": "Testimonial approved"}), 200
    except Exception as e:
        logger.error(f"Failed to approve testimonial: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/testimonials/<testimonial_id>', methods=['DELETE'])
def delete_testimonial(testimonial_id):
    auth_error = check_admin_key()
    if auth_error: return auth_error
    try:
        result = testimonials_collection.delete_one({"_id": ObjectId(testimonial_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Testimonial not found"}), 404
        return "", 204
    except Exception as e:
        logger.error(f"Failed to delete testimonial: {e}")
        return jsonify({"error": "Internal server error"}), 500

# --- Coupons ---
@app.route('/api/coupons', methods=['POST'])
def add_coupon():
    auth_error = check_admin_key()
    if auth_error: return auth_error
    data = request.get_json()
    if not data or not data.get('code') or not data.get('discount'):
        return jsonify({"error": "Missing required fields"}), 400
    try:
        coupon = {
            "code": data.get('code').upper(),
            "discount": float(data.get('discount')),
            "created_at": datetime.now(timezone.utc)
        }
        if coupons_collection.find_one({"code": coupon["code"]}):
            return jsonify({"error": "Coupon code already exists"}), 409
        result = coupons_collection.insert_one(coupon)
        new_coupon = coupons_collection.find_one({"_id": result.inserted_id})
        return jsonify(serialize_doc(new_coupon)), 201
    except Exception as e:
        logger.error(f"Failed to add coupon: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/coupons', methods=['GET'])
def get_coupons():
    # This is for admin, add auth
    auth_error = check_admin_key()
    if auth_error: return auth_error
    try:
        all_coupons = coupons_collection.find()
        return jsonify([serialize_doc(c) for c in all_coupons])
    except Exception as e:
        logger.error(f"Failed to fetch coupons: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/coupons/<coupon_id>', methods=['DELETE'])
def delete_coupon(coupon_id):
    auth_error = check_admin_key()
    if auth_error: return auth_error
    try:
        result = coupons_collection.delete_one({"_id": ObjectId(coupon_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Coupon not found"}), 404
        return "", 204
    except Exception as e:
        logger.error(f"Failed to delete coupon: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/coupons/apply', methods=['POST'])
def apply_coupon():
    # Public route for checkout
    data = request.get_json()
    code = data.get('code', '').upper()
    if not code:
        return jsonify({"error": "Coupon code is required"}), 400
    try:
        coupon = coupons_collection.find_one({"code": code})
        if not coupon:
            return jsonify({"error": "Invalid coupon code"}), 404
        return jsonify(serialize_doc(coupon))
    except Exception as e:
        logger.error(f"Failed to apply coupon: {e}")
        return jsonify({"error": "Internal server error"}), 500

# --- Contact Form Route ---
@app.route('/api/contact', methods=['POST'])
def contact_form():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    subject = data.get('subject')
    message = data.get('message')

    if not name or not email or not message:
        return jsonify({"error": "Name, email, and message are required"}), 400

    try:
        # Send email to admin
        admin_subject = subject if subject else "New Contact Form Message"
        admin_body = f"""
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <p>You have a new message from the Everaura contact form:</p>
            <p><strong>Name:</strong> {name}</p>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Message:</strong></p>
            <p style="padding-left: 10px; border-left: 2px solid #ccc;">{message.replace('\\n', '<br>')}</p>
        </div>
        """
        send_email(CONTACT_EMAIL, admin_subject, admin_body)
        
        # Send confirmation email to user
        user_subject = "We've received your message!"
        user_body = f"""
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <p>Hi {name},</p>
            <p>Thank you for contacting Everaura Beauty! We've received your message and will get back to you as soon as possible.</p>
            <p><strong>Your Message:</strong></p>
            <p style="padding-left: 10px; border-left: 2px solid #ccc;">{message.replace('\\n', '<br>')}</p>
            <br>
            <p>Thank you,<br>The Everaura Team</p>
        </div>
        """
        send_email(email, user_subject, user_body)
        
        return jsonify({"success": True, "message": "Email sent successfully!"})
    except Exception as e:
        logger.critical(f"CRITICAL: Contact form email failed. Check EMAIL_USER/EMAIL_PASS. Error: {e}")
        return jsonify({"success": False, "error": "Could not send message due to a server error."}), 500


# --- Health Check ---
@app.route('/api/health', methods=['GET'])
def health_check():
    # Check DB connections
    try:
        client_main.admin.command('ping')
        client_orders.admin.command('ping')
        return jsonify({"status": "ok", "message": "Backend and Databases are running"}), 200
    except Exception as e:
        logger.error(f"Health check failed: DB connection error: {e}")
        return jsonify({"status": "error", "message": "Backend is running, but database connection failed"}), 500

# --- Main Runner ---
if __name__ == '__main__':
    if not all([MONGO_URI_MAIN, MONGO_URI_ORDERS, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, EMAIL_USER, EMAIL_PASS, SECRET_KEY, ADMIN_KEY]):
        logger.warning("Missing one or more critical environment variables!")
    app.run(debug=True, port=os.getenv("PORT", 5000))
