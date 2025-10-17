const API_URL = "https://everaurabeauty-backend.onrender.com/api";

// --- DOM Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    const navToggle = document.querySelector(".mobile-nav-toggle");
    const navLinks = document.querySelector(".nav-links");
    if (navToggle && navLinks) {
        navToggle.addEventListener("click", () => {
            navToggle.classList.toggle("active");
            navLinks.classList.toggle("active");
        });
    }

    // --- NEW: Initialize Toggles ---
    initializeToggles();

    // --- Page-Specific Content Loading ---
    loadPageSpecificContent();

    // Event listener for toggles
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
        toggle.addEventListener('change', loadPageSpecificContent);
    });

    if (document.getElementById("testimonial-form")) {
        document
            .getElementById("testimonial-form")
            .addEventListener("submit", handleTestimonialSubmit);
    }

    updateCartCount();
});

function initializeToggles() {
    const savedGender = localStorage.getItem('selectedGender') || '0'; // Default to 'Her'
    const genderToggle = document.getElementById('gender-toggle-checkbox');
    if (genderToggle) {
        genderToggle.checked = savedGender === '1'; // '1' is 'Him'
    }
}

function loadPageSpecificContent() {
    if (document.getElementById("trending-product-list")) {
        loadTrendingProducts();
    }
    if (document.getElementById("testimonial-list")) {
        loadTestimonials();
    }
    if (document.getElementById("all-reviews-list")) {
        loadAllReviews();
    }
    if (document.getElementById("shop-product-list")) {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get("category");
        loadAllProducts(category || "all");
        setupCategoryFilters();
    }
}


// --- Data Fetching (MODIFIED) ---
async function fetchProducts(category = 'all', gender = '0', type = null) {
    let url = new URL(`${API_URL}/products`);
    if (category && category !== 'all') {
        url.searchParams.append('category', category);
    }
    if (gender) {
        url.searchParams.append('gender', gender);
    }
    if (type !== null && type !== 'all') {
        url.searchParams.append('type', type);
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

// --- Product Loading Functions (MODIFIED for new card structure and filtering) ---
async function loadProducts(containerId, isTrending = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Get filter states
    const genderToggle = document.getElementById('gender-toggle-checkbox');
    const selectedGender = genderToggle && genderToggle.checked ? '1' : '0';
    localStorage.setItem('selectedGender', selectedGender); // Save preference

    const typeToggle = document.getElementById('type-toggle-checkbox');
    // 'all' for trending, respect toggle on shop page
    const selectedType = isTrending ? null : (typeToggle && typeToggle.checked ? '1' : '0');


    const allProducts = await fetchProducts('all', selectedGender, selectedType);
    let productsToDisplay = allProducts;

    if(isTrending) {
        productsToDisplay = allProducts.filter(p => p.isTrending === 'y').slice(0, 8);
    }


    const wishlist = getWishlist();
    container.innerHTML = "";

    productsToDisplay.forEach((product) => {
        const isWishlisted = wishlist.some((item) => item._id === product._id);
        const productElement = document.createElement(isTrending ? 'div' : 'div');
        if(isTrending) productElement.className = "swiper-slide";


        const firstImage = product.images && product.images.length > 0 ? product.images[0] : "https://via.placeholder.com/400x550?text=No+Image";

        productElement.innerHTML = `
            <div class="product-card">
                <div class="product-card-inner">
                    <div class="product-card-front">
                        <div class="product-image">
                            <img src="${firstImage}" alt="${product.name}">
                            <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist('${product._id}', this)"><i class="fa-solid fa-heart"></i></button>
                        </div>
                        <div class="product-info">
                            <div>
                                <h3>${product.name}</h3>
                                <p class="price">₹${product.price.toFixed(2)}</p>
                            </div>
                            <button class="add-to-cart-btn" onclick="addToCart('${product._id}')">Add to Cart</button>
                        </div>
                    </div>
                    <div class="product-card-back">
                        <h4>Description</h4>
                        <p>${product.description || 'No description available.'}</p>
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
    await loadProducts('trending-product-list', true);
}


async function loadAllProducts(category = "all") {
    const container = document.getElementById("shop-product-list");
    if (!container) return;

    const genderToggle = document.getElementById('gender-toggle-checkbox');
    const selectedGender = genderToggle && genderToggle.checked ? '1' : '0';
    localStorage.setItem('selectedGender', selectedGender);

    const typeToggle = document.getElementById('type-toggle-checkbox');
    const selectedType = typeToggle ? (typeToggle.checked ? '1' : '0') : null;


    const productsToDisplay = await fetchProducts(category, selectedGender, selectedType);
    const wishlist = getWishlist();
    container.innerHTML = '';

    productsToDisplay.forEach(product => {
        const isWishlisted = wishlist.some(item => item._id === product._id);
        const productCard = document.createElement('div');
        // productCard.className = "product-card"; // The grid will handle the layout

        const firstImage = (product.images && product.images.length > 0) ? product.images[0] : 'https://via.placeholder.com/400x550?text=No+Image';

        productCard.innerHTML = `
          <div class="product-card">
            <div class="product-card-inner">
                <div class="product-card-front">
                    <div class="product-image">
                         <img src="${firstImage}" alt="${product.name}">
                        <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist('${product._id}', this)"><i class="fa-solid fa-heart"></i></button>
                    </div>
                    <div class="product-info">
                        <div>
                            <h3>${product.name}</h3>
                            <p class="price">₹${product.price.toFixed(2)}</p>
                        </div>
                        <button class="add-to-cart-btn" onclick="addToCart('${product._id}')">Add to Cart</button>
                    </div>
                </div>
                <div class="product-card-back">
                    <h4>Description</h4>
                    <p>${product.description || 'No description available.'}</p>
                </div>
            </div>
            </div>`;
        container.appendChild(productCard);
    });

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
      reviewCard.className = "testimonial-slide";
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

// --- NEW/UPDATED Testimonial Functions ---

async function loadAllReviewsInteractive() {
  const container = document.getElementById("all-reviews-list");
  if (!container) return;
  try {
    const response = await fetch(`${API_URL}/testimonials/approved`);
    const testimonials = await response.json();
    container.innerHTML = "";
    if (testimonials.length === 0) {
      container.innerHTML =
        '<p style="text-align: center;">No reviews have been posted yet.</p>';
      return;
    }

    testimonials.forEach((t) => {
      const reviewCard = document.createElement("div");
      reviewCard.className = "review-card";

      // Store full data on the element to pass to the modal function
      const reviewData = JSON.stringify(t).replace(/"/g, "&quot;");

      reviewCard.innerHTML = `
                <p class="summary">"${t.summary}"</p>
                <p class="name">- ${t.name}</p>`;

      reviewCard.setAttribute("onclick", `openReviewModal(${reviewData})`);
      container.appendChild(reviewCard);
    });
  } catch (error) {
    console.error("Could not load reviews:", error);
  }
}

function openReviewModal(reviewData) {
  const modal = document.getElementById("review-detail-modal");
  if (!modal) return;

  modal.innerHTML = `
        <div class="review-content">
            <button class="cart-modal-close" onclick="closeModal('review-detail-modal')">&times;</button>
            <p class="summary">"${reviewData.summary}"</p>
            ${
              reviewData.full_review
                ? `<p class="full-review">${reviewData.full_review}</p>`
                : ""
            }
            <p class="name">- ${reviewData.name}</p>
        </div>
    `;
  modal.style.display = "flex";
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
          loadAllProducts(e.target.dataset.category);
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
function initializeShopCarousels() {
  document.querySelectorAll("#shop-product-list .swiper").forEach((e) => {
    new Swiper(e, {
      loop: !0,
      pagination: { el: ".swiper-pagination", clickable: !0 },
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
    });
  });
}
function getWishlist() {
  return JSON.parse(localStorage.getItem("wishlist")) || [];
}
function saveWishlist(e) {
  localStorage.setItem("wishlist", JSON.stringify(e));
}

async function toggleWishlist(productId, buttonElem) {
  let wishlist = getWishlist();
  const alreadyExists = wishlist.some((item) => item._id === productId);

  if (alreadyExists) {
    // Remove from wishlist
    wishlist = wishlist.filter((item) => item._id !== productId);
    buttonElem.classList.remove("active");
    showToast("Removed from wishlist");
  } else {
    // Add to wishlist
    const allProducts = await fetchProducts(); // fetch all products
    const productToAdd = allProducts.find((item) => item._id === productId);
    if (productToAdd) {
      wishlist.push(productToAdd);
      buttonElem.classList.add("active"); // <-- use buttonElem, not array
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
        )}</span></div><button onclick="addToCart('${
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
async function addToCart(e) {
  const t = getCart(),
    o = t.find((t) => t._id === e);
  if (o) o.quantity++;
  else {
    const o = await fetchProducts(),
      a = o.find((t) => t._id === e);
    if (a) {
      const n =
        a.images && a.images.length > 0
          ? a.images[0]
          : "https://via.placeholder.com/60x60?text=No+Img";
      t.push({
        _id: a._id,
        name: a.name,
        price: a.price,
        quantity: 1,
        image: n,
      });
    } else return;
  }
  saveCart(t), updateCartCount(), showToast("Added to your cart");
}
function openCartModal() {
  const modal = document.getElementById("cart-modal");
  if (!modal) return;

  const cartItemsContainer = document.getElementById("cart-items");
  const cartTotals = document.getElementById("cart-totals");
  const appliedCouponDisplay = document.getElementById("applied-coupon");
  const appliedCouponCode = document.getElementById("applied-coupon-code");

  const cart = getCart();
  let subtotal = 0;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
    cartTotals.innerHTML = `<p>Subtotal: <span id="cart-subtotal">₹0.00</span></p>
                                <p>Total after coupon: <span id="cart-total">₹0.00</span></p>`;
  } else {
    let itemsHTML = `<ul class="cart-items-list">`;
    cart.forEach((item) => {
      itemsHTML += `
                <li class="cart-item">
                    <img src="${item.image}" alt="${
        item.name
      }" class="cart-item-image">
                    <div class="cart-item-details">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-price">Qty: ${
                          item.quantity
                        } × ₹${item.price.toFixed(2)}</span>
                    </div>
                    <button onclick="removeFromCart('${
                      item._id
                    }')" class="cart-item-remove">&times;</button>
                </li>`;
      subtotal += item.price * item.quantity;
    });
    itemsHTML += "</ul>";
    cartItemsContainer.innerHTML = itemsHTML;
  }

  // Handle coupons (if applied)
  const storedCoupon = JSON.parse(
    sessionStorage.getItem("appliedCoupon") || "null"
  );
  let total = subtotal;

  if (storedCoupon) {
    const discount = storedCoupon.discount || 0;
    total = subtotal - (subtotal * discount) / 100;
    appliedCouponDisplay.style.display = "flex";
    appliedCouponCode.textContent = `Coupon "${storedCoupon.code}" applied (-${discount}%)`;
  } else {
    appliedCouponDisplay.style.display = "none";
  }

  cartTotals.innerHTML = `
        <p>Subtotal: <span id="cart-subtotal">₹${subtotal.toFixed(2)}</span></p>
        <p>Total after coupon: <span id="cart-total">₹${total.toFixed(
          2
        )}</span></p>
    `;

  modal.style.display = "flex";
}
function removeFromCart(e) {
  let t = getCart();
  const o = t.findIndex((t) => t._id === e);
  -1 !== o &&
    (t[o].quantity > 1 ? t[o].quantity-- : t.splice(o, 1),
    saveCart(t),
    updateCartCount(),
    openCartModal());
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
function showToast(e) {
  const t = document.getElementById("toast-container"),
    o = document.createElement("div");
  (o.className = "toast"),
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
function sendToWhatsApp() {
  const cart = getCart();
  if (!cart.length) return alert("Your cart is empty!");

  const appliedCoupon = JSON.parse(sessionStorage.getItem("appliedCoupon"));
  let subtotal = 0;
  cart.forEach((item) => (subtotal += item.price * item.quantity));

  let discount = 0;
  if (appliedCoupon) {
    discount = (appliedCoupon.discount / 100) * subtotal;
  }
  const total = subtotal - discount;

  let message = "🛍 *Everaura Order Summary:*\n\n";
  cart.forEach((item) => {
    message += `• ${item.name} (x${item.quantity}) - ₹${item.price.toFixed(
      2
    )}\n`;
  });
  message += `\nSubtotal: ₹${subtotal.toFixed(2)}`;
  if (appliedCoupon)
    message += `\nDiscount (${appliedCoupon.code}): -₹${discount.toFixed(2)}`;
  message += `\n*Total Payable: ₹${total.toFixed(
    2
  )}*\n\nPlease confirm my order.`;

  const whatsappURL = `https://wa.me/919999999999?text=${encodeURIComponent(
    message
  )}`;
  window.open(whatsappURL, "_blank");
}

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

    // Store coupon
    sessionStorage.setItem("appliedCoupon", JSON.stringify(data));

    // Update UI and totals
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
    couponInput.value = "";
  } else {
    couponDisplay.style.display = "none";
  }
}

// === FIXED LOGIC: recomputes subtotal from actual cart ===
function updateCartTotals() {
  const cart = getCart();
  let subtotal = 0;

  // Recalculate subtotal
  cart.forEach((item) => {
    subtotal += item.price * item.quantity;
  });

  // Check for applied coupon
  const appliedCoupon = JSON.parse(sessionStorage.getItem("appliedCoupon"));
  const discountPercent = appliedCoupon ? appliedCoupon.discount : 0;

  const discountAmount = (subtotal * discountPercent) / 100;
  const total = subtotal - discountAmount;

  // Update DOM
  const subtotalElem = document.getElementById("cart-subtotal");
  const totalElem = document.getElementById("cart-total");

  if (subtotalElem) subtotalElem.textContent = `₹${subtotal.toFixed(2)}`;
  if (totalElem) totalElem.textContent = `₹${total.toFixed(2)}`;
}

function proceedToCheckout() {
  const cart = getCart();
  if (!cart.length) return alert("Your cart is empty!");

  const appliedCoupon = JSON.parse(sessionStorage.getItem("appliedCoupon"));
  let subtotal = 0;
  cart.forEach((item) => (subtotal += item.price * item.quantity));

  const discountPercent = appliedCoupon ? appliedCoupon.discount : 0;
  const discountAmount = (subtotal * discountPercent) / 100;
  const total = subtotal - discountAmount;

  let message = `🛍 *Everaura Order Summary* 🛍\n\n`;
  cart.forEach((item) => {
    message += `• ${item.name} (x${item.quantity}) — ₹${(
      item.price * item.quantity
    ).toFixed(2)}\n`;
  });
  message += `\nSubtotal: ₹${subtotal.toFixed(2)}`;
  if (appliedCoupon) {
    message += `\nCoupon: ${appliedCoupon.code} (-${appliedCoupon.discount}%)`;
    message += `\nDiscount: ₹${discountAmount.toFixed(2)}`;
  }
  message += `\n*Total Payable:* ₹${total.toFixed(
    2
  )}\n\nPlease confirm my order.✨`;

  const encodedMsg = encodeURIComponent(message);
  const whatsappNumber = "919425545594"; // Replace with your WhatsApp number
  const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMsg}`;
  window.open(whatsappURL, "_blank");
}
