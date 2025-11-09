// --- CONFIGURATION ---
const API_URL = "https://everaura-backend.vercel.app/api"; // Ensure this matches your deployed backend
const FRONTEND_URL = "https://everaurabeauty.com";

// --- AUTH HELPERS ---
function saveToken(token) {
    localStorage.setItem('jwtToken', token);
}
function getToken() {
    return localStorage.getItem('jwtToken');
}
function isLoggedIn() {
    const token = getToken();
    if (!token) return false;
    return true;
}
function logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('everauraUser');
    showToast("You have been logged out.");
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}
function saveUser(user) {
    localStorage.setItem('everauraUser', JSON.stringify(user));
}
function getUser() {
    try {
        return JSON.parse(localStorage.getItem('everauraUser'));
    } catch (e) {
        return null;
    }
}

// --- DOM Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    // --- Mobile Navigation Logic ---
    const navToggle = document.querySelector(".mobile-nav-toggle");
    const navLinks = document.querySelector(".nav-links");
    if (navToggle && navLinks) {
        navToggle.addEventListener("click", () => {
        navToggle.classList.toggle("active");
        navLinks.classList.toggle("active");
        });
    }

    updateHeaderUI();
    initializeToggles();
    loadPageSpecificContent();
    updateCartCount();

    // Event listener for toggles
    document.querySelectorAll(".toggle-switch input").forEach((toggle) => {
        toggle.addEventListener("change", loadPageSpecificContent);
    });

    // --- Page-Specific Listeners ---

    // LOGIN PAGE
    if (document.getElementById("send-otp-form")) {
        document.getElementById("send-otp-form").addEventListener("submit", handleSendOTP);
        document.getElementById("verify-otp-form").addEventListener("submit", handleVerifyOTP);
        document.getElementById("resend-otp-link").addEventListener("click", (e) => {
            e.preventDefault();
            handleSendOTP(e, true); // Pass 'true' to indicate resend
        });
    }

    // CHECKOUT PAGE
    if (document.getElementById("checkout-form")) {
        document.getElementById("place-order-btn").addEventListener("click", handlePlaceOrder);
        loadCheckoutPage();
    }
    
    // MY ORDERS PAGE
    if (document.getElementById("orders-list-container")) {
        if (!isLoggedIn()) {
            window.location.href = 'login.html';
        } else {
            loadMyOrders();
        }
    }

    // TESTIMONIAL FORM
    if (document.getElementById("testimonial-form")) {
        document.getElementById("testimonial-form").addEventListener("submit", handleTestimonialSubmit);
    }

    // CONTACT FORM
    const contactForm = document.getElementById("contact-form");
    if (contactForm) {
        contactForm.addEventListener("submit", handleContactFormSubmit);
    }
});

function updateHeaderUI() {
    const navLinks = document.querySelector(".nav-links");
    const headerIcons = document.querySelector(".header-icons");
    if (!navLinks || !headerIcons) return;

    // Clear existing auth links
    navLinks.querySelectorAll('.auth-link').forEach(el => el.remove());
    headerIcons.querySelectorAll('.auth-link').forEach(el => el.remove());

    if (isLoggedIn()) {
        // --- Desktop Nav Links ---
        const myOrdersLink = document.createElement('li');
        myOrdersLink.className = 'auth-link';
        myOrdersLink.innerHTML = `<a href="my-orders.html">My Orders</a>`;
        navLinks.appendChild(myOrdersLink);
        
        const logoutLink = document.createElement('li');
        logoutLink.className = 'auth-link';
        logoutLink.innerHTML = `<a href="#" id="logout-btn">Logout</a>`;
        navLinks.appendChild(logoutLink);

        // --- Mobile Icon Links (Use a class to hide on desktop) ---
        const myOrdersIcon = document.createElement('a');
        myOrdersIcon.href = "my-orders.html";
        myOrdersIcon.className = 'auth-link mobile-only-icon';
        myOrdersIcon.setAttribute('aria-label', 'My Orders');
        myOrdersIcon.innerHTML = `<i class="fa-solid fa-box"></i>`;
        headerIcons.appendChild(myOrdersIcon);

        const logoutIcon = document.createElement('a');
        logoutIcon.href = "#";
        logoutIcon.className = 'auth-link mobile-only-icon';
        logoutIcon.id = 'logout-btn-icon';
        logoutIcon.setAttribute('aria-label', 'Logout');
        logoutIcon.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i>`;
        headerIcons.appendChild(logoutIcon);

        // Add logout event listeners
        document.getElementById('logout-btn').addEventListener('click', (e) => { e.preventDefault(); logout(); });
        document.getElementById('logout-btn-icon').addEventListener('click', (e) => { e.preventDefault(); logout(); });
        
    } else {
        // --- Desktop Nav Links ---
        const loginLink = document.createElement('li');
        loginLink.className = 'auth-link';
        loginLink.innerHTML = `<a href="login.html">Login</a>`;
        navLinks.appendChild(loginLink);
        
        // --- Mobile Icon Links ---
        const loginIcon = document.createElement('a');
        loginIcon.href = "login.html";
        loginIcon.className = 'auth-link mobile-only-icon';
        loginIcon.setAttribute('aria-label', 'Login');
        loginIcon.innerHTML = `<i class="fa-solid fa-user"></i>`;
        headerIcons.appendChild(loginIcon);
    }
}


function initializeToggles() {
    const savedGender = localStorage.getItem("selectedGender") || "0";
    const genderToggle = document.getElementById("gender-toggle-checkbox");
    if (genderToggle) {
        genderToggle.checked = savedGender === "1";
    }
}

function loadPageSpecificContent() {
    const path = window.location.pathname.split("/").pop() || "index.html";
    
    if (path === 'index.html') {
        loadTrendingProducts();
        loadTestimonials();
    }
    if (path === 'reviews.html') {
        loadAllReviews();
    }
    if (path === 'shop.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get("category");
        loadAllProducts(category || "all");
        setupCategoryFilters();
    }
}

// --- API & Data Fetching ---
async function fetchProducts(category = "all", gender = null, type = null) {
    let url = new URL(`${API_URL}/products`);
    if (category && category !== "all") {
        url.searchParams.append("category", category);
    }
    if (gender) {
        url.searchParams.append("gender", gender);
    }
    if (type !== null && type !== "all") {
        url.searchParams.append("type", type);
    }
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Could not fetch products:", error);
        return [];
    }
}

// --- Product Loading Functions ---
async function renderProducts(containerId, isTrending = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const genderToggle = document.getElementById("gender-toggle-checkbox");
  const selectedGender = genderToggle && genderToggle.checked ? "1" : "0";
  localStorage.setItem("selectedGender", selectedGender);

  const typeToggle = document.getElementById("type-toggle-checkbox");
  const selectedType = isTrending
    ? null
    : typeToggle && typeToggle.checked
    ? "1"
    : "0";

  const category = isTrending
    ? "all"
    : new URLSearchParams(window.location.search).get("category") || "all";

  const productsToDisplay = await fetchProducts(
    category,
    selectedGender,
    selectedType
  );
  let finalProducts = productsToDisplay;

  if (isTrending) {
    finalProducts = productsToDisplay
      .filter((p) => p.isTrending === "y")
      .slice(0, 8);
  }

  const wishlist = getWishlist();
  container.innerHTML = "";

  finalProducts.forEach((product) => {
    const isWishlisted = wishlist.some((item) => item._id === product._id);
    const productElement = document.createElement(isTrending ? "div" : "div");
    if (isTrending) productElement.className = "swiper-slide";

    const firstImage =
      product.images && product.images.length > 0
        ? product.images[0]
        : "https://via.placeholder.com/400x550?text=No+Image";

    productElement.innerHTML = `
        <div class="product-card" onclick="flipCard(event, this)">
                <div class="product-card-inner">
                    <div class="product-card-front">
                        <div class="product-image">
                            <img src="${firstImage}" alt="${product.name}">
                            <button class="wishlist-btn ${
                              isWishlisted ? "active" : ""
                            }" onclick="toggleWishlist(event, '${
      product._id
    }', this)"><i class="fa-solid fa-heart"></i></button>
                        </div>
                        <div class="product-info">
                            <div>
                                <h3>${product.name}</h3>
                                <p class="price">₹${product.price.toFixed(
                                  2
                                )}</p>
                            </div>
                            <button class="add-to-cart-btn" onclick="addToCart(event, '${
                              product._id
                            }')">Add to Cart</button>
                        </div>
                    </div>
                    <div class="product-card-back">
                        <h4>Description</h4>
                        <p>${
                          product.description || "No description available."
                        }</p>
                    </div>
                </div>
            </div>`;
    container.appendChild(productElement);
  });

  if (isTrending) {
    initializeFeaturedCarousel();
  }
}

async function loadTrendingProducts() {
  await renderProducts("trending-product-list", true);
}

async function loadAllProducts() {
  await renderProducts("shop-product-list", false);
  const category =
    new URLSearchParams(window.location.search).get("category") || "all";
  updateActiveFilterButton(category);
}

// --- Testimonial Functions ---
async function loadTestimonials() {
  const container = document.getElementById("testimonial-list");
  if (!container) return;
  try {
    const response = await fetch(`${API_URL}/testimonials/approved`);
    if (!response.ok) throw new Error("Failed to fetch testimonials");
    const testimonials = await response.json();
    container.innerHTML = "";
    if (testimonials.length === 0) {
      container.innerHTML =
        '<p style="padding: 2rem; text-align: center; width: 100%;">Be the first to leave a review!</p>';
      return;
    }
    testimonials.forEach((t) => {
      const slide = document.createElement("div");
      slide.className = "swiper-slide testimonial-slide";
      slide.innerHTML = `<p class="summary">"${t.summary}"</p><p class="name">- ${t.name}</p>`;
      container.appendChild(slide);
    });
    new Swiper(".testimonial-swiper", {
      loop: testimonials.length > 1,
      autoplay: { delay: 5000, disableOnInteraction: false },
      pagination: { el: ".swiper-pagination", clickable: true },
    });
  } catch (error) {
    console.error("Could not load testimonials:", error);
  }
}

async function loadAllReviews() {
  const container = document.getElementById("all-reviews-list");
  if (!container) return;
  try {
    const response = await fetch(`${API_URL}/testimonials/approved`);
    const testimonials = await response.json();
    container.innerHTML = "";
    testimonials.forEach((t) => {
      const reviewCard = document.createElement("div");
      reviewCard.className = "testimonial-slide"; // Using 'testimonial-slide' class for consistent styling
      reviewCard.innerHTML = `<p class="summary">"${t.summary}"</p>${
        t.full_review ? `<p>${t.full_review}</p>` : ""
      }<p class="name">- ${t.name}</p>`;
      container.appendChild(reviewCard);
    });
  } catch (error) {
    console.error("Could not load reviews:", error);
  }
}

function openTestimonialModal() {
  const modal = document.getElementById("testimonial-modal");
  if (modal) modal.style.display = "flex";
}

async function handleTestimonialSubmit(event) {
  event.preventDefault();
  const data = {
    name: document.getElementById("testimonial-name").value,
    contact: document.getElementById("testimonial-contact").value,
    summary: document.getElementById("testimonial-summary").value,
    full_review: document.getElementById("testimonial-full").value,
  };
  try {
    const response = await fetch(`${API_URL}/testimonials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Submission failed.");
    closeModal("testimonial-modal");
    showToast("Thank you! Your review is awaiting approval.");
    document.getElementById("testimonial-form").reset();
  } catch (error) {
    console.error("Error submitting testimonial:", error);
    alert("There was an error submitting your review.");
  }
}

// --- UI Initializers & Other Functions ---
function setupCategoryFilters() {
  const e = document.getElementById("category-filter-bar");
  e &&
    e.addEventListener("click", (e) => {
      if (e.target.classList.contains("filter-btn")) {
        const category = e.target.dataset.category;
        const url = new URL(window.location);
        url.searchParams.set("category", category);
        window.history.pushState({}, "", url);
        loadAllProducts();
      }
    });
}
function updateActiveFilterButton(e) {
  document.querySelectorAll(".filter-btn").forEach((t) => {
    t.classList.toggle("active", t.dataset.category === e);
  });
}
function initializeFeaturedCarousel() {
  new Swiper(".featured-swiper", {
    loop: !0,
    slidesPerView: 1,
    spaceBetween: 20,
    autoplay: { delay: 3e3, disableOnInteraction: !1 },
    navigation: {
      nextEl: ".featured-carousel-container .swiper-button-next",
      prevEl: ".featured-carousel-container .swiper-button-prev",
    },
    breakpoints: {
      640: { slidesPerView: 2 },
      992: { slidesPerView: 3 },
      1200: { slidesPerView: 4 },
    },
  });
}

// --- Wishlist Logic ---
function getWishlist() {
  return JSON.parse(localStorage.getItem("wishlist")) || [];
}
function saveWishlist(e) {
  localStorage.setItem("wishlist", JSON.stringify(e));
}

async function toggleWishlist(event, productId, buttonElem) {
  event.stopPropagation();
  let wishlist = getWishlist();
  const productIndex = wishlist.findIndex((item) => item._id === productId);

  if (productIndex > -1) {
    wishlist.splice(productIndex, 1);
    buttonElem.classList.remove("active");
    showToast("Removed from wishlist");
  } else {
    const allProducts = await fetchProducts("all", null, null);
    const productToAdd = allProducts.find((item) => item._id === productId);
    if (productToAdd) {
      wishlist.push(productToAdd);
      buttonElem.classList.add("active");
      showToast("Added to wishlist!");
    } else {
      console.error("Product not found for wishlist:", productId);
    }
  }
  saveWishlist(wishlist);
}

function openWishlistModal() {
  const e = document.getElementById("wishlist-modal");
  if (!e) return;
  const t = getWishlist();
  let o = `<div class="cart-modal-content"><button class="cart-modal-close" onclick="closeModal('wishlist-modal')">&times;</button><h3>Your Wishlist</h3>`;
  0 === t.length
    ? (o += "<p>Your wishlist is empty.</p>")
    : ((o +=
        '<div class="modal-header"><button class="modal-clear-btn" onclick="clearWishlist()">Clear Wishlist</button></div>'),
      (o += '<ul class="cart-items-list">'),
      t.forEach((e) => {
        const t =
          e.images && e.images.length > 0
            ? e.images[0]
            : "https://via.placeholder.com/60x60?text=No+Img";
        o += `<li class="cart-item"><img src="${t}" alt="${
          e.name
        }" class="cart-item-image"><div class="cart-item-details"><span class="cart-item-name">${
          e.name
        }</span><span class="cart-item-price">₹${e.price.toFixed(
          2
        )}</span></div><button onclick="addToCart(event, '${
          e._id
        }');" class="add-to-cart-btn" style="width: auto; margin-left: 1rem;">Add to Cart</button></li>`;
      }),
      (o += "</ul>")),
    (o += "</div>"),
    (e.innerHTML = o),
    (e.style.display = "flex");
}
function clearWishlist() {
  saveWishlist([]),
    updateAllWishlistIcons(),
    openWishlistModal(),
    showToast("Wishlist has been cleared.");
}
function updateAllWishlistIcons() {
  document.querySelectorAll(".wishlist-btn").forEach((e) => {
    e.classList.remove("active");
  });
}

// --- Cart Logic ---
function closeModal(e) {
  document.getElementById(e).style.display = "none";
}
window.onclick = function (e) {
  e.target.classList.contains("modal-overlay") &&
    (e.target.style.display = "none");
};
function getCart() {
  const e = document.cookie.split("; ").find((e) => e.startsWith("cart="));
  if (e)
    try {
      return JSON.parse(decodeURIComponent(e.split("=")[1]));
    } catch (e) {
      return [];
    }
  return [];
}
function saveCart(e) {
  const t = new Date(Date.now() + 6048e5).toUTCString();
  document.cookie = `cart=${encodeURIComponent(
    JSON.stringify(e)
  )}; expires=${t}; path=/`;
}

async function addToCart(event, productId) {
  event.stopPropagation();
  const t = getCart(),
    o = t.find((t) => t._id === productId);
  if (o) o.quantity++;
  else {
    const allProducts = await fetchProducts("all", null, null);
    const productToAdd = allProducts.find((p) => p._id === productId);
    if (productToAdd) {
      const n =
        productToAdd.images && productToAdd.images.length > 0
          ? productToAdd.images[0]
          : "https://via.placeholder.com/60x60?text=No+Img";
      t.push({
        _id: productToAdd._id,
        name: productToAdd.name,
        price: productToAdd.price,
        quantity: 1,
        image: n,
      });
    } else {
      console.error("Product not found to add to cart:", productId);
      return;
    }
  }
  saveCart(t), updateCartCount(), showToast("Added to your cart");
}

function openCartModal() {
  const modal = document.getElementById("cart-modal");
  if (!modal) return;
  const cartItemsContainer = document.getElementById("cart-items");
  const cartTotals = document.getElementById("cart-totals");
  const cart = getCart();
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
    if(cartTotals) cartTotals.innerHTML = `<p>Subtotal: <span id="cart-subtotal">₹0.00</span></p>
                                <p>Total after coupon: <span id="cart-total">₹0.00</span></p>`;
  } else {
    let itemsHTML = `<ul class="cart-items-list">`;
    cart.forEach((item) => {
      itemsHTML += `
                <li class="cart-item">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-details">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-price">₹${item.price.toFixed(2)}</span>
                        <div class="quantity-controls">
                          <button onclick="decreaseQuantity('${item._id}')">−</button>
                          <input type="number" value="${item.quantity}" min="1" readonly>
                          <button onclick="increaseQuantity('${item._id}')">+</button>
                        </div>
                    </div>
                    <button onclick="removeFromCart('${item._id}')" class="cart-item-remove">&times;</button>
                </li>`;
    });
    itemsHTML += "</ul>";
    cartItemsContainer.innerHTML = itemsHTML;
  }
  updateCartTotals();
  modal.style.display = "flex";
}


function removeFromCart(e) {
  let t = getCart();
  const o = t.findIndex((t) => t._id === e);
  if (-1 !== o) {
    t.splice(o, 1);
    saveCart(t);
    updateCartCount();
    openCartModal();
  }
}

function increaseQuantity(productId) {
  let cart = getCart();
  const index = cart.findIndex(item => item._id === productId);
  if (index !== -1) {
    cart[index].quantity++;
    saveCart(cart);
    updateCartCount();
    openCartModal();
  }
}

function decreaseQuantity(productId) {
  let cart = getCart();
  const index = cart.findIndex(item => item._id === productId);
  if (index !== -1 && cart[index].quantity > 1) {
    cart[index].quantity--;
    saveCart(cart);
    updateCartCount();
    openCartModal();
  } else if (index !== -1 && cart[index].quantity === 1) { // Remove item if quantity becomes 0
    cart.splice(index, 1);
    saveCart(cart);
    updateCartCount();
    openCartModal();
  }
}
function clearCart() {
  saveCart([]),
    updateCartCount(),
    openCartModal(),
    showToast("Cart has been cleared.");
}
function updateCartCount() {
  const e = getCart(),
    t = e.reduce((e, t) => e + t.quantity, 0),
    o = document.getElementById("cart-count");
  o && (o.innerText = t);
}
function showToast(e, type = "success") { // Added type for error toasts
  const t = document.getElementById("toast-container"),
    o = document.createElement("div");
  (o.className = `toast ${type === 'error' ? 'toast-error' : ''}`), // Add error class
    (o.textContent = e),
    t.appendChild(o),
    setTimeout(() => {
      o.classList.add("show");
    }, 10),
    setTimeout(() => {
      o.classList.remove("show"),
        setTimeout(() => {
          o.parentNode && o.parentNode.removeChild(o);
        }, 500);
    }, 3e3);
}

// --- Coupon and Checkout Logic ---
async function applyCoupon() {
  const codeInput = document.getElementById("coupon-code-input").value.trim();
  if (!codeInput) return alert("Please enter a coupon code.");
  try {
    const res = await fetch(`${API_URL}/coupons/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codeInput }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Invalid coupon");
    }
    sessionStorage.setItem("appliedCoupon", JSON.stringify(data));
    updateCouponUI(data);
    updateCartTotals();
    showToast(`Coupon "${data.code}" applied successfully!`);
  } catch (err) {
    alert(err.message);
    sessionStorage.removeItem("appliedCoupon");
  }
}

function removeCoupon() {
  sessionStorage.removeItem("appliedCoupon");
  updateCouponUI(null);
  updateCartTotals();
  showToast("Coupon removed.");
}

function updateCouponUI(coupon) {
  const couponDisplay = document.getElementById("applied-coupon");
  const couponInput = document.getElementById("coupon-code-input");
  if (coupon) {
    couponDisplay.style.display = "flex";
    document.getElementById(
      "applied-coupon-code"
    ).textContent = `${coupon.code} - ${coupon.discount}% OFF`;
    if (couponInput) couponInput.value = "";
  } else {
    couponDisplay.style.display = "none";
  }
}

function updateCartTotals() {
  const cart = getCart();
  let subtotal = 0;
  cart.forEach((item) => {
    subtotal += item.price * item.quantity;
  });
  const appliedCoupon = JSON.parse(sessionStorage.getItem("appliedCoupon"));
  const discountPercent = appliedCoupon ? appliedCoupon.discount : 0;
  const discountAmount = (subtotal * discountPercent) / 100;
  const total = subtotal - discountAmount;
  const subtotalElem = document.getElementById("cart-subtotal");
  const totalElem = document.getElementById("cart-total");
  if (subtotalElem) subtotalElem.textContent = `₹${subtotal.toFixed(2)}`;
  if (totalElem) totalElem.textContent = `₹${total.toFixed(2)}`;
}

function proceedToCheckout() {
  const cart = getCart();
  if (!cart.length) {
      alert("Your cart is empty!");
      return;
  }
  
  if (isLoggedIn()) {
      window.location.href = 'checkout.html';
  } else {
      alert("Please log in to proceed to checkout.");
      window.location.href = 'login.html';
  }
}


function flipCard(event, cardElement) {
  if (event.target.closest('button, a, .wishlist-btn i')) {
      return;
  }
  const innerCard = cardElement.querySelector('.product-card-inner');
  if (innerCard) {
      innerCard.classList.toggle('is-flipped');
  }
}


// --- Contact Form Submission ---
async function handleContactFormSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(btn, true, "Sending...");

    const formData = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        subject: document.getElementById("subject").value.trim(),
        message: document.getElementById("message").value.trim(),
    };

    if (!formData.name || !formData.email || !formData.message) {
        alert("Please fill in your name, email, and message.");
        setButtonLoading(btn, false, "Send Message");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/contact`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });
        const data = await response.json();
        if (response.ok && data.success) {
            showToast("Thank you! Your message has been sent.");
            e.target.reset();
        } else {
            throw new Error(data.error || "Failed to send message.");
        }
    } catch (err) {
        console.error("Error sending contact message:", err);
        showToast("Error: " + err.message, "error");
    } finally {
        setButtonLoading(btn, false, "Send Message");
    }
}


// --- PAGE-SPECIFIC LOGIC ---

// --- LOGIN PAGE (NEW: Improved Error Handling) ---
async function handleSendOTP(event, isResend = false) {
    event.preventDefault();
    setFormMessage("", "success"); // Clear previous messages

    const email = document.getElementById("email").value;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Simple email regex
    
    if (!email) {
        setFormMessage("Please enter an email address.", "error");
        return;
    }
    if (!emailPattern.test(email)) {
        setFormMessage("Please enter a valid email address.", "error");
        return;
    }
    
    const btn = document.getElementById(isResend ? "resend-otp-link" : "send-otp-btn");
    setButtonLoading(btn, true, isResend ? "Resending..." : "Sending...");

    try {
        const response = await fetch(`${API_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        // This is the new, more robust error handling
        if (!response.ok) {
            let errorMsg = "An unknown error occurred.";
            try {
                // Try to get the JSON error from the backend
                const data = await response.json();
                errorMsg = data.error || `Server error: ${response.status}`;
            } catch (jsonError) {
                // The response was not JSON (e.g., a 500 Vercel crash page)
                errorMsg = `Server error: ${response.status} (${response.statusText}). Check backend logs.`;
            }
            throw new Error(errorMsg); // Throw to be caught below
        }

        const data = await response.json(); // This is now safe

        setFormMessage("OTP sent successfully! Check your email.", "success");
        document.getElementById("send-otp-form").style.display = "none";
        document.getElementById("verify-otp-form").style.display = "block";
        document.getElementById("user-email-display").textContent = email;
    } catch (error) {
        setFormMessage(error.message, "error");
    } finally {
        setButtonLoading(btn, false, isResend ? "Resend OTP" : "Send OTP");
    }
}

async function handleVerifyOTP(event) {
    event.preventDefault();
    setFormMessage("", "success"); // Clear previous messages

    const email = document.getElementById("email").value;
    const otp = document.getElementById("otp").value;
    const otpPattern = /^\d{6}$/; // 6 digits only

    if (!otp) {
        setFormMessage("Please enter your OTP.", "error");
        return;
    }
    if (!otpPattern.test(otp)) {
        setFormMessage("OTP must be 6 digits.", "error"); // This fixes the "pattern" error
        return;
    }
    
    const btn = document.getElementById("verify-otp-btn");
    setButtonLoading(btn, true, "Verifying...");

    try {
        const response = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, otp: otp })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to verify OTP");

        saveToken(data.token);
        saveUser(data.user);
        
        setFormMessage("Login successful! Redirecting...", "success");
        const cart = getCart();
        if (cart.length > 0) {
            window.location.href = "checkout.html";
        } else {
            window.location.href = "my-orders.html";
        }
    } catch (error) {
        setFormMessage(error.message, "error");
    } finally {
        setButtonLoading(btn, false, "Login");
    }
}

// --- CHECKOUT PAGE ---
async function loadCheckoutPage() {
    if (!isLoggedIn()) {
        window.location.href = `login.html`;
        return;
    }
    
    const cart = getCart();
    if (cart.length === 0) {
        alert("Your cart is empty. Redirecting to shop.");
        window.location.href = 'shop.html';
        return;
    }

    const itemsContainer = document.getElementById("checkout-cart-items");
    itemsContainer.innerHTML = "";
    cart.forEach(item => {
        itemsContainer.innerHTML += `
            <div class="checkout-cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <span class="cart-item-name">${item.name} (x${item.quantity})</span>
                    <span class="cart-item-price">₹${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            </div>`;
    });
    updateCartTotals();

    try {
        const token = getToken();
        const meResponse = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (meResponse.ok) {
            const user = await meResponse.json();
            document.getElementById('checkout-name').value = user.name || '';
            document.getElementById('checkout-email').value = user.email || '';
            document.getElementById('checkout-phone').value = user.phone || '';
            document.getElementById('checkout-address').value = user.address || '';
            document.getElementById('checkout-city').value = user.city || '';
            document.getElementById('checkout-pincode').value = user.pincode || '';
        } else {
            const user = getUser();
            if (user) {
                document.getElementById('checkout-email').value = user.email || '';
            }
        }
    } catch (error) {
        console.error("Failed to fetch user details:", error);
    }
}

async function handlePlaceOrder() {
    const btn = document.getElementById("place-order-btn");
    setButtonLoading(btn, true, "Placing Order...");
    setFormMessage("", "success");
    
    const shipping_address = {
        name: document.getElementById('checkout-name').value,
        email: document.getElementById('checkout-email').value,
        phone: document.getElementById('checkout-phone').value,
        address: document.getElementById('checkout-address').value,
        city: document.getElementById('checkout-city').value,
        pincode: document.getElementById('checkout-pincode').value,
    };

    for (const key in shipping_address) {
        if (!shipping_address[key]) {
            setFormMessage(`Please fill in all shipping details. Missing: ${key}`, "error");
            setButtonLoading(btn, false, "Place Order & Pay");
            return;
        }
    }

    const cart = getCart();
    const appliedCoupon = JSON.parse(sessionStorage.getItem("appliedCoupon"));
    const coupon_code = appliedCoupon ? appliedCoupon.code : null;

    const orderData = {
        items: cart,
        shipping_address: shipping_address,
        coupon_code: coupon_code
    };

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/orders/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            let errorMsg = "An unknown error occurred.";
            try {
                const data = await response.json();
                errorMsg = data.error || `Server error: ${response.status}`;
            } catch (jsonError) {
                errorMsg = `Server error: ${response.status} (${response.statusText}). Check backend logs.`;
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        clearCart();
        sessionStorage.removeItem("appliedCoupon");
        setFormMessage("Order created! Redirecting to payment...", "success");
        
        window.location.href = data.payment_url;

    } catch (error) {
        setFormMessage(error.message, "error");
        setButtonLoading(btn, false, "Place Order & Pay");
    }
}

// --- MY ORDERS PAGE ---
async function loadMyOrders() {
    const container = document.getElementById("orders-list-container");
    container.innerHTML = "<p>Loading your orders...</p>";
    
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/orders/my-orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) {
            logout();
            return;
        }
        if (!response.ok) throw new Error("Failed to fetch orders");
        
        const orders = await response.json();
        if (orders.length === 0) {
            container.innerHTML = "<p>You have not placed any orders yet.</p>";
            return;
        }

        container.innerHTML = "";
        orders.forEach(order => {
            const orderCard = document.createElement("div");
            orderCard.className = "order-card";
            
            const itemsHtml = order.items.map(item => `
                <div class="order-item">
                    <img src="${item.image}" alt="${item.name}">
                    <span>${item.name} (x${item.quantity})</span>
                    <span>₹${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `).join("");

            let trackingHtml = '';
            if (order.status === "Shipped" && order.tracking_link) {
                trackingHtml = `<a href="${order.tracking_link}" class="cta-button" target="_blank">Track Package</a>`;
            } else if (order.status === "Delivered") {
                trackingHtml = `<p class="order-status-delivered">Delivered</p>`;
            }

            orderCard.innerHTML = `
                <div class="order-card-header">
                    <div>
                        <h3>Order ID: ${order.order_id}</h3>
                        <p>Placed on: ${new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <span class="order-status ${order.status.toLowerCase()}">${order.status}</span>
                        <span class="order-total">Total: ₹${order.total_amount.toFixed(2)}</span>
                    </div>
                </div>
                <div class="order-card-body">
                    ${itemsHtml}
                </div>
                <div class="order-card-footer">
                    <div>
                        <strong>Shipping To:</strong> ${order.shipping_address.name}<br>
                        ${order.shipping_address.address}, ${order.shipping_address.city} - ${order.shipping_address.pincode}
                    </div>
                    <div class="order-tracking">
                        ${trackingHtml}
                    </div>
                </div>
            `;
            container.appendChild(orderCard);
        });

    } catch (error) {
        container.innerHTML = `<p class="form-message-error">Error: ${error.message}</p>`;
    }
}

// --- ADMIN API HELPERS ---
/**
 * Helper for fetch calls to admin endpoints. Always adds the X-ADMIN-KEY header.
 */
async function adminFetch(url, options = {}) {
    const adminKeyHeader = { "X-ADMIN-KEY": "admineveraura2025" };
    options.headers = options.headers
        ? { ...options.headers, ...adminKeyHeader }
        : { ...adminKeyHeader };
    return fetch(url, options);
}

// --- FORM UI HELPERS ---
function setButtonLoading(button, isLoading, loadingText = "Loading...") {
    if (!button) return;
    
    if (!button.dataset.originalText) {
        button.dataset.originalText = button.innerHTML;
    }
    const originalText = button.dataset.originalText;

    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${loadingText}`;
    } else {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

function setFormMessage(message, type = "success") {
    const msgEl = document.getElementById("form-message");
    if (!msgEl) return;
    msgEl.textContent = message;
    msgEl.className = `form-message ${type === 'error' ? 'form-message-error' : 'form-message-success'}`;
    msgEl.style.display = message ? "block" : "none";
}

// --- ADMIN FUNCTIONS ---
// Example: Fetch all orders for admin dashboard
// Usage: Call this function where admin wants to view all orders
async function loadAdminOrders() {
    // Assumes there is a container with id "admin-orders-list"
    const container = document.getElementById("admin-orders-list");
    if (!container) return;
    container.innerHTML = "<p>Loading all orders...</p>";
    try {
        const response = await adminFetch(`${API_URL}/admin/orders`);
        if (!response.ok) throw new Error("Failed to fetch admin orders");
        const orders = await response.json();
        if (orders.length === 0) {
            container.innerHTML = "<p>No orders found.</p>";
            return;
        }
        container.innerHTML = "";
        orders.forEach(order => {
            const orderDiv = document.createElement("div");
            orderDiv.className = "admin-order-card";
            orderDiv.innerHTML = `
                <h4>Order ID: ${order.order_id}</h4>
                <p>Status: ${order.status}</p>
                <p>Total: ₹${order.total_amount.toFixed(2)}</p>
                <p>Placed on: ${new Date(order.created_at).toLocaleString()}</p>
            `;
            container.appendChild(orderDiv);
        });
    } catch (err) {
        container.innerHTML = `<p class="form-message-error">Error: ${err.message}</p>`;
    }
}
