
# Everaura Beauty E-Commerce Platform

[](https://www.google.com/search?q=https://github.com/jainrochak05)
[](https://opensource.org/licenses/MIT)

Everaura Beauty is a full-stack e-commerce platform designed for a bespoke jewelry business. It features a complete customer-facing storefront and a comprehensive admin dashboard for managing products, testimonials, and promotions.

The application is built with a vanilla JavaScript frontend and a Python (Flask) backend, backed by a MongoDB database and Cloudinary for media management.

## Features

### 1\. Customer-Facing Storefront

  * **Dynamic Homepage:** Features a hero section, category links, and a carousel for trending products.
  * **Shop Page:** Grid view of all products with advanced filtering by category, gender (His/Hers), and type (Anti-Tarnish/Jewelry).
  * **Product Details:** Interactive product cards that flip on click to show a detailed description.
  * **Shopping Cart:** A persistent (cookie-based) shopping cart with features for adding, removing, and updating item quantities.
  * **Wishlist:** A local-storage-based wishlist to save favorite items.
  * **Coupon System:** Apply discount codes in the cart, which are validated by the backend.
  * **WhatsApp Ordering:** A streamlined checkout process that generates a pre-filled WhatsApp message with the order summary.
  * **Community Reviews:**
      * View all approved testimonials on a dedicated "Reviews" page.
      * Submit new testimonials, which are held for admin approval.
  * **Contact Form:** A functional "Contact Us" page that sends an email to the site admin via the backend API.
  * **Static Pages:** Includes "Our Story" (About Us) page with founder information.

### 2\. Admin Dashboard

  * **Secure Login:** A separate login portal for administrators.
  * **Product Management (CRUD):**
      * View all products in a comprehensive table.
      * Create new products, including image uploads directly to Cloudinary.
      * Automatic **RSN (Reference Stock Number)** generation based on category, type, and gender.
      * Edit product details (name, price, category, trending status, etc.).
      * Delete products from the database.
  * **Testimonial Management:**
      * View all submitted testimonials (both pending and approved) in one place.
      * Approve pending testimonials to make them public.
      * Delete any testimonial.
  * **Coupon Management (CRUD):**
      * Create new discount coupons (e.g., "SAVE10" for 10% off).
      * View all active coupons.
      * Delete expired or unwanted coupons.

## Technology Stack

| Area | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | Vanilla HTML, CSS, JavaScript | Custom-built, responsive, and interactive user interface. |
| | [Swiper.js](https://swiperjs.com/) | Used for product and testimonial carousels. |
| **Backend** | [Python 3](https://www.python.org/) | Core programming language. |
| | [Flask](https://flask.palletsprojects.com/) | A lightweight web framework for building the REST API. |
| | [Gunicorn](https://gunicorn.org/) | WSGI server (listed in `requirements.txt`). |
| **Database** | [MongoDB](https://www.mongodb.com/) | NoSQL database used to store products, testimonials, and coupons. |
| | [Flask-PyMongo](https://flask-pymongo.readthedocs.io/) | Connects Flask to MongoDB. |
| **Media** | [Cloudinary](https://cloudinary.com/) | Cloud-based service for all product image hosting and management. |
| **Deployment** | [Vercel](https://vercel.com/) | Platform for deploying the Python/Flask backend. |
| | [GitHub Pages](https://pages.github.com/) | Platform for deploying the static frontend. |
| **Utilities** | [SMTP (smtplib)](https://docs.python.org/3/library/smtplib.html) | Used by the backend to send emails from the contact form. |

## Project Structure

```
EverAuraBeauty/
├── .github/workflows/
│   └── deploy.yml           # GitHub Actions workflow to deploy frontend to GitHub Pages
├── backend/
│   ├── app.py               # Main Flask application (all API routes)
│   ├── requirements.txt     # Python dependencies
│   ├── vercel.json          # Vercel deployment configuration
│   ├── .env                 # Environment variables template (MUST be created)
│   ├── migrate.py           # Script to seed the database from products.json
│   ├── upload_images.py     # Utility script to migrate local images to Cloudinary
│   └── products.json        # A local JSON file with initial product data
└── frontend/
    ├── *.html               # All customer-facing and admin HTML pages
    ├── assets/
    │   ├── css/             # All stylesheets
    │   ├── js/              # All JavaScript files (app.js, dashboard.js)
    │   └── images/          # Local images and favicon
    └── ...
```

## Getting Started

Follow these instructions to get a local copy of the project up and running.

### Prerequisites

  * [Python 3.x](https://www.python.org/downloads/)
  * [MongoDB](https://www.mongodb.com/try/download/community) account (a free cluster on MongoDB Atlas is recommended)
  * [Cloudinary](https://cloudinary.com/users/register/free) account
  * A Gmail account (or other SMTP server) for the contact form

### 1\. Backend Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/jainrochak05/everaurabeauty.git
    cd everaurabeauty/backend
    ```

2.  **Create a virtual environment and install dependencies:**

    ```bash
    # Create virtual environment
    python3 -m venv venv
    # Activate it (macOS/Linux)
    source venv/bin/activate
    # Or (Windows)
    .\venv\Scripts\activate

    # Install requirements
    pip install -r requirements.txt
    ```

3.  **Create the environment file:**
    Create a file named `.env` in the `backend/` directory and paste the following content. Fill in the values from your MongoDB, Cloudinary, and email accounts.

    ```ini
    # From backend/.env
    MONGO_URI=your_mongodb_connection_string
    CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
    CLOUDINARY_API_KEY=your_cloudinary_api_key
    CLOUDINARY_API_SECRET=your_cloudinary_api_secret

    SECRET_KEY=a_very_strong_random_secret_key_for_flask
    FRONTEND_URL=http://127.0.0.1:5500 # URL where your frontend will run

    # For Contact Form (e.g., Gmail App Password)
    CONTACT_EMAIL=your_email@gmail.com
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_gmail_app_password
    ```

4.  **Seed the Database:**
    Run the `migrate.py` script to populate your MongoDB database with the initial product data from `products.json`.

    ```bash
    python migrate.py
    ```

    *Note: This script will clear the existing `products` collection before inserting new data.*

5.  **Run the Backend Server:**

    ```bash
    flask run
    # Or for production-like environment:
    # gunicorn app:app
    ```

    The backend API will be running at `http://127.0.0.1:5000`.

### 2\. Frontend Setup

1.  **Configure API URL:**
    Open `frontend/assets/js/app.js` and `frontend/assets/js/dashboard.js`. Find the `API_URL` constant at the top of both files and ensure it points to your running backend.

    ```javascript
    // In app.js and dashboard.js
    const API_URL = "http://127.0.0.1:5000/api"; // For local development
    // const API_URL = "https://everaurabeauty-backend.onrender.com/api"; // Production
    ```

2.  **Run the Frontend:**
    The easiest way to run the frontend is with a live server. If you use VS Code, you can install the **Live Server** extension.

      * Right-click `frontend/index.html` and select "Open with Live Server".
      * The site will open, typically at `http://127.0.0.1:5500`.

### 3\. Admin Credentials

The admin panel login is hardcoded for simplicity.

  * **Username:** `admin`
  * **Password:** `password123`

Access the admin panel by navigating to `http://127.0.0.1:5500/admin.html`.

## API Endpoints

All API routes are defined in `backend/app.py`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/products` | Get all products. Can be filtered with query params: `?category=`, `?gender=`, `?type=`. |
| `POST` | `/api/products` | Add a new product (requires form-data with images). |
| `PUT` | `/api/products/<product_id>` | Update an existing product. |
| `DELETE` | `/api/products/<product_id>` | Delete a product. |
| `GET` | `/api/testimonials` | Get all testimonials (pending and approved). |
| `POST` | `/api/testimonials` | Submit a new testimonial (sets status to "pending"). |
| `GET` | `/api/testimonials/approved` | Get only approved testimonials. |
| `PUT` | `/api/testimonials/<testimonial_id>/approve` | Change a testimonial's status to "approved". |
| `DELETE` | `/api/testimonials/<testimonial_id>` | Delete a testimonial. |
| `GET` | `/api/coupons` | Get all coupon codes. |
| `POST` | `/api/coupons` | Create a new coupon. |
| `DELETE` | `/api/coupons/<coupon_id>` | Delete a coupon. |
| `POST` | `/api/coupons/apply` | Validate a coupon code and return its discount. |
| `POST` | `/api/contact` | Send an email from the contact form. |
| `GET` | `/api/health` | Health check endpoint. |

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

-----

**Author:** **Team Mediofusion**
