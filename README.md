# Everaura Beauty

[![Live Deployment](https://img.shields.io/badge/Live-Demo-brightgreen)](https://everaurabeauty.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Live URL:** [https://everaurabeauty.com](https://everaurabeauty.com)

Everaura Beauty is a full-stack e-commerce platform built for a bespoke jewelry business. It features a modern, customer-facing storefront with real-time payments and a secure admin dashboard for inventory management. 

The application is properly deployed and live, utilizing a Python (Flask) backend and a vanilla JavaScript frontend.

---

## 🚀 Key Features

### 🛍️ Customer Storefront
* **Live Payments:** Fully integrated **Razorpay** gateway for secure credit/debit, UPI, and Netbanking transactions.
* **Passwordless Login:** Secure, email-based OTP (One-Time Password) authentication. No passwords to remember.
* **Order Tracking:**
    * Dedicated "My Orders" dashboard for customers.
    * Real-time status updates (Pending → Paid → Shipped → Delivered).
    * Integration with external tracking links (e.g., India Post).
* **Shopping Experience:**
    * Persistent Cart and Wishlist.
    * Coupon code system for discounts.
    * Advanced product filtering (Category, Gender, Material).
* **Responsive Design:** Optimized for mobile and desktop with touch-enabled carousels.

### 🛡️ Admin Dashboard
* **Secure Access:** Protected via a custom API Key mechanism.
* **Order Management:** View all incoming orders, update payment statuses, and assign tracking numbers.
* **Inventory Control:** Full CRUD (Create, Read, Update, Delete) for products.
* **Content Management:** Moderate customer testimonials and manage active coupon codes.
* **Automated Emails:** The system sends automated emails for OTPs, order confirmations, shipping updates, and contact form inquiries.

---

## 🛠️ Technology Stack

| Area | Technology | Usage |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript | Custom-built UI with no heavy frameworks. |
| | Swiper.js | Interactive product and testimonial sliders. |
| **Backend** | Python (Flask) | RESTful API server. |
| | Flask-JWT-Extended | Secure token-based authentication. |
| | Razorpay SDK | Payment link generation and webhook handling. |
| **Database** | MongoDB (Atlas) | **Dual-Database Architecture:** Segregated DBs for store content and user/order data. |
| **Services** | Cloudinary | Cloud hosting for product images. |
| | Gmail SMTP | Transactional email service. |

---

## ⚙️ Installation & Setup

Follow these steps to run the project locally.

### Prerequisites
* Python 3.10+
* MongoDB Atlas Account
* Razorpay Merchant Account (Test Mode allowed)
* Cloudinary Account

### 1. Backend Setup

```bash
# Clone the repository
git clone [https://github.com/jainrochak05/everaurabeauty.git](https://github.com/jainrochak05/everaurabeauty.git)
cd everaurabeauty/backend

# Create virtual environment
python -m venv venv
# Windows: .\venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
