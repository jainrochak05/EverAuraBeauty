// !IMPORTANT: Set this key to match your backend .env ADMIN_KEY
const ADMIN_KEY = "admineveraura2025"; // <-- SET THIS

const API_URL = "https://everaura-backend.vercel.app/api";

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("login-form")) {
    document.getElementById("login-form").addEventListener("submit", handleLogin);
  } else if (document.getElementById("product-table-body")) {
    checkAuth();
    loadAdminOrders(); // <-- ADDED
    loadProductsIntoTable();
    loadAllTestimonials();
    loadCouponsIntoTable();
    
    const couponForm = document.getElementById("coupon-form");
    if (couponForm) {
      couponForm.addEventListener("submit", handleAddCoupon);
    }
  }
});

// --- ADMIN AUTH HEADERS ---
function getAdminHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-ADMIN-KEY': ADMIN_KEY
    };
}
function getAdminHeadersFormData() {
    // For FormData, we don't set Content-Type
    return {
        'X-ADMIN-KEY': ADMIN_KEY
    };
}


// === COUPON MANAGEMENT (MODIFIED) ===
async function loadCouponsIntoTable() {
  const tbody = document.getElementById("coupon-table-body");
  if (!tbody) return;
  
  try {
    const response = await fetch(`${API_URL}/coupons`, {
        headers: getAdminHeaders() // <-- MODIFIED
    });
    const coupons = await response.json();
    tbody.innerHTML = "";
    
    coupons.forEach((coupon) => {
      tbody.innerHTML += `
        <tr>
          <td data-label="Code">${coupon.code}</td>
          <td data-label="Discount">${coupon.discount}%</td>
          <td data-label="Actions" class="action-buttons">
            <button class="delete-btn" onclick="deleteCoupon('${coupon._id}')" title="Delete">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>`;
    });
  } catch (error) {
    console.error("Failed to load coupons:", error);
    tbody.innerHTML = '<tr><td colspan="3">Error loading coupons.</td></tr>';
  }
}

async function handleAddCoupon(e) {
  e.preventDefault();
  const data = {
    code: document.getElementById("coupon-code").value,
    discount: document.getElementById("coupon-discount").value,
  };
  
  try {
    const response = await fetch(`${API_URL}/coupons`, {
      method: "POST",
      headers: getAdminHeaders(), // <-- MODIFIED
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create coupon");
    }
    
    loadCouponsIntoTable();
    document.getElementById("coupon-form").reset();
    alert("Coupon created successfully!");
  } catch (error) {
    console.error("Error:", error);
    alert(`Failed to create coupon: ${error.message}`);
  }
}

async function deleteCoupon(id) {
  if (!confirm("Are you sure you want to delete this coupon?")) return;
  
  try {
    const response = await fetch(`${API_URL}/coupons/${id}`, { 
        method: "DELETE",
        headers: getAdminHeaders() // <-- MODIFIED
    });
    if (response.ok) {
      loadCouponsIntoTable();
      alert("Coupon deleted successfully!");
    } else {
      alert("Failed to delete coupon.");
    }
  } catch (error) {
    console.error("Error deleting coupon:", error);
    alert("Failed to delete coupon.");
  }
}

// === TESTIMONIAL MANAGEMENT (MODIFIED) ===
async function loadAllTestimonials() {
  const tableBody = document.getElementById("all-testimonials-body");
  if (!tableBody) return;

  try {
    const response = await fetch(`${API_URL}/testimonials`, {
        headers: getAdminHeaders() // <-- MODIFIED
    });
    let testimonials = await response.json();
    tableBody.innerHTML = "";
    if (!Array.isArray(testimonials) || testimonials.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5">No testimonials found.</td></tr>';
      return;
    }
    
    testimonials.sort((a, b) => (a.status === 'pending') ? -1 : (b.status === 'pending') ? 1 : 0);

    testimonials.forEach((t) => {
      const statusBadge = t.status === "approved" 
        ? '<span style="color: var(--admin-green);">✓ Approved</span>'
        : '<span style="color: #f39c12;">⏳ Pending</span>';

      let actionButtons = '';
      if (t.status === 'pending') {
          actionButtons = `
            <button class="approve-btn" onclick="approveTestimonial('${t._id}')" title="Approve">
              <i class="fa-solid fa-check"></i>
            </button>`;
      }
      actionButtons += `
        <button class="delete-btn" onclick="deleteTestimonial('${t._id}')" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>`;

      const row = `
        <tr>
          <td data-label="Name">${t.name}</td>
          <td data-label="Summary">${t.summary}</td>
          <td data-label="Full Review">${t.full_review || "N/A"}</td>
          <td data-label="Status">${statusBadge}</td>
          <td data-label="Actions" class="action-buttons">
            ${actionButtons}
          </td>
        </tr>`;
      tableBody.innerHTML += row;
    });
  } catch (error) {
    console.error("Failed to load all testimonials:", error);
    tableBody.innerHTML = '<tr><td colspan="5">Error loading testimonials.</td></tr>';
  }
}


async function approveTestimonial(testimonialId) {
  if (!confirm("Approve this testimonial to make it public?")) return;

  try {
    const response = await fetch(`${API_URL}/testimonials/${testimonialId}/approve`, {
      method: "PUT",
      headers: getAdminHeaders() // <-- MODIFIED
    });
    
    if (!response.ok) throw new Error("Failed to approve.");
    
    loadAllTestimonials();
    alert("Testimonial approved!");
  } catch (error) {
    console.error("Error approving testimonial:", error);
    alert("Approval failed. Please try again.");
  }
}

async function deleteTestimonial(testimonialId) {
  if (!confirm("Are you sure you want to permanently delete this testimonial?")) return;

  try {
    const response = await fetch(`${API_URL}/testimonials/${testimonialId}`, {
      method: "DELETE",
      headers: getAdminHeaders() // <-- MODIFIED
    });
    
    if (!response.ok) throw new Error("Failed to delete.");
    
    loadAllTestimonials();
    alert("Testimonial deleted.");
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    alert("Deletion failed. Please try again.");
  }
}


// === AUTHENTICATION ===
function checkAuth() {
  if (sessionStorage.getItem("isAdminLoggedIn") !== "true") {
    window.location.replace("admin.html");
  }
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  
  // This is a simple client-side gate. The *real* security is the ADMIN_KEY.
  if (username === "admin" && password === "password123") {
    sessionStorage.setItem("isAdminLoggedIn", "true");
    window.location.href = "dashboard.html";
  } else {
    alert("Invalid credentials. Please try again.");
  }
}

function logout() {
  sessionStorage.removeItem("isAdminLoggedIn");
  window.location.replace("admin.html");
}

// === PRODUCT MANAGEMENT (MODIFIED) ===
async function loadProductsIntoTable() {
  const tbody = document.getElementById("product-table-body");
  if (!tbody) return;
  
  try {
    const response = await fetch(`${API_URL}/products`); // Public GET
    if (!response.ok) throw new Error("Failed to fetch products");
    
    const products = await response.json();
    tbody.innerHTML = "";
    
    products.sort((a, b) => {
      if (a.rsn && b.rsn) return a.rsn.localeCompare(b.rsn);
      return 0;
    }).forEach((product) => {
      const imageUrl = product.images && product.images.length > 0
        ? product.images[0]
        : "https://via.placeholder.com/50x50/1D1D1D/EAEAEA?text=No+Img";
      
      const genderValue = product.gender;
      const genderDisplay = genderValue === "0" ? "Her" : genderValue === "1" ? "Him" : "N/A";

      const typeValue = product.type;
      const typeDisplay = typeValue === 0 ? "Anti-Tarnish" : typeValue === 1 ? "Jewelry" : "N/A";
      
      const description = product.description || "N/A";
      const shortDescription = description.length > 50 ? description.substring(0, 50) + '...' : description;

      tbody.innerHTML += `
        <tr>
          <td data-label="Image"><img src="${imageUrl}" alt="${product.name}" class="table-product-image"></td>
          <td data-label="RSN">${product.rsn || "N/A"}</td>
          <td data-label="Name">${product.name}</td>
          <td data-label="Price">₹${product.price.toFixed(2)}</td>
          <td data-label="Category">${product.category || "N/A"}</td>
          <td data-label="Gender">${genderDisplay}</td>
          <td data-label="Type">${typeDisplay}</td>
          <td data-label="Description" title="${description}">${shortDescription}</td>
          <td data-label="Trending">${product.isTrending === "y" ? "Yes" : "No"}</td>
          <td data-label="Actions" class="action-buttons">
            <button class="edit-btn" onclick="showEditProductModal('${product._id}')" title="Edit">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="delete-btn" onclick="deleteProduct('${product._id}')" title="Delete">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>`;
    });
  } catch (error) {
    console.error("Failed to load products:", error);
    tbody.innerHTML = '<tr><td colspan="10">Error loading products.</td></tr>';
  }
}


function createProductForm(product = {}) {
  const isEdit = !!product._id;
  const title = isEdit ? `Edit Product (RSN: ${product.rsn || "N/A"})` : "Add New Product";
  const genderValue = typeof product.gender !== "undefined" ? product.gender : "0";
  const typeValue = typeof product.type !== "undefined" ? product.type : 0;
  const materialValue = typeof product.material !== "undefined" ? product.material : 0;
  
  // Determine tarnishValue from type
  const tarnishValue = typeValue === 0 ? "y" : "n";

  return `
    <div class="modal-content">
      <button class="modal-close-btn" onclick="closeProductModal()">&times;</button>
      <h3>${title}</h3>
      <form id="product-form" onsubmit="event.preventDefault(); handleFormSubmit('${product._id || ""}')">
        <div class="form-grid">
          <div class="form-group">
            <label for="product-name">Name</label>
            <input type="text" id="product-name" value="${product.name || ""}" required>
          </div>
          <div class="form-group">
            <label for="product-price">Price</label>
            <input type="number" id="product-price" value="${product.price || ""}" step="0.01" required>
          </div>
          <div class="form-group">
            <label for="product-category">Main Category</label>
            <select id="product-category" required onchange="updateRSNPreview();">
              <option value="Necklaces" ${product.category === "Necklaces" ? "selected" : ""}>Necklaces</option>
              <option value="Earrings" ${product.category === "Earrings" ? "selected" : ""}>Earrings</option>
              <option value="Rings" ${product.category === "Rings" ? "selected" : ""}>Rings</option>
              <option value="Bangles/Bracelets" ${product.category === "Bangles/Bracelets" ? "selected" : ""}>Bangles/Bracelets</option>
            </select>
          </div>
          <div class="form-group">
            <label for="product-gender">Gender</label>
            <select id="product-gender" onchange="updateRSNPreview();">
              <option value="0" ${genderValue === "0" ? "selected" : ""}>Her</option>
              <option value="1" ${genderValue === "1" ? "selected" : ""}>Him</option>
            </select>
          </div>
          <div class="form-group">
            <label for="product-tarnish">Tarnish Type</label>
            <select id="product-tarnish" required onchange="toggleMaterialDropdown(); updateRSNPreview();">
              <option value="y" ${tarnishValue === "y" ? "selected" : ""}>Anti-Tarnish</option>
              <option value="n" ${tarnishValue === "n" ? "selected" : ""}>Jewelry</option>
            </select>
          </div>
          <div class="form-group" id="material-dropdown-container" style="display:none;">
            <label for="product-material">Material</label>
            <select id="product-material" onchange="updateRSNPreview();">
              <option value="0" ${materialValue === 0 ? "selected" : ""}>Anti Tarnish</option>
              <option value="1" ${materialValue === 1 ? "selected" : ""}>Meenakari</option>
              <option value="2" ${materialValue === 2 ? "selected" : ""}>Kundan</option>
              <option value="3" ${materialValue === 3 ? "selected" : ""}>American Diamond</option>
              <option value="4" ${materialValue === 4 ? "selected" : ""}>Resin</option>
              <option value="5" ${materialValue === 5 ? "selected" : ""}>Chandbali</option>
              <option value="6" ${materialValue === 6 ? "selected" : ""}>Chanderi</option>
              <option value="7" ${materialValue === 7 ? "selected" : ""}>Pearl</option>
            </select>
          </div>
          <div class="form-group">
            <label for="rsn-preview">RSN Preview (Auto-generated)</label>
            <input type="text" id="rsn-preview" readonly style="background:#2a2a2a; border:1px solid #444; color:#888;">
          </div>
          <div class="form-group form-group-checkbox">
            <input type="checkbox" id="product-trending" ${product.isTrending === "y" ? "checked" : ""}>
            <label for="product-trending">Is Trending?</label>
          </div>
        </div>
        
        <div class="form-group">
          <label for="product-description">Product Description</label>
          <textarea id="product-description" rows="4" placeholder="Enter product description...">${product.description || ""}</textarea>
        </div>
        
        ${!isEdit ? `
        <div class="form-group">
          <label for="product-image">Product Image (Primary)</label>
          <input type="file" id="product-image" name="image" accept="image/*" required>
        </div>` : ""}
        
        <button type="submit" class="cta-button admin-button">${isEdit ? "Save Changes" : "Add Product"}</button>
      </form>
    </div>`;
}

function toggleMaterialDropdown() {
  const tarnish = document.getElementById("product-tarnish");
  const materialContainer = document.getElementById("material-dropdown-container");
  
  if (!materialContainer || !tarnish) return;
  
  materialContainer.style.display = (tarnish.value === "n") ? "block" : "none";
}

function getCategoryCode(category) {
  const map = {
    "Earrings": "1",
    "Bangles/Bracelets": "2",
    "Necklaces": "3",
    "Rings": "4",
  };
  return map[category] || "0";
}

async function getNextArticleNumber(prefix) {
  try {
    const response = await fetch(`${API_URL}/products`);
    if (!response.ok) throw new Error("Failed to fetch products");
    const products = await response.json();

    const filtered = products.filter(p => p.rsn && p.rsn.startsWith(prefix));
    let maxArticleNum = 0;
    filtered.forEach(p => {
      const rsnStr = p.rsn;
      if (rsnStr && rsnStr.length >= 4) {
        const artNum = parseInt(rsnStr.slice(-4), 10);
        if (!isNaN(artNum) && artNum > maxArticleNum) maxArticleNum = artNum;
      }
    });

    return (maxArticleNum + 1).toString().padStart(4, "0");
  } catch (error) {
    console.error("Error fetching products for article number:", error);
    return "0001";
  }
}

async function generateRSN(category, gender, type, material) {
  const categoryCode = getCategoryCode(category);
  const genderCode = gender || "0";
  const typeCode = type || "0";
  const materialCode = (type === "1") ? (material || "0") : "0"; // Material is 0 if Anti-Tarnish

  const prefix = `${categoryCode}${genderCode}${typeCode}${materialCode}`;
  const nextArticleNumber = await getNextArticleNumber(prefix);

  return `${prefix}${nextArticleNumber}`;
}

async function updateRSNPreview() {
  const category = document.getElementById("product-category")?.value;
  const gender = document.getElementById("product-gender")?.value;
  const tarnishValue = document.getElementById("product-tarnish")?.value;
  const type = tarnishValue === "y" ? "0" : "1";
  
  let material = "0";
  if (type === "1") {
    material = document.getElementById("product-material")?.value || "0";
  }
  
  const rsn = await generateRSN(category, gender, type, material);
  const previewInput = document.getElementById("rsn-preview");
  if (previewInput) {
    previewInput.value = rsn;
  }
}

async function showEditProductModal(id) {
  try {
    const response = await fetch(`${API_URL}/products`);
    const products = await response.json();
    const product = products.find((p) => p._id === id);
    
    if (!product) {
      alert("Product not found!");
      return;
    }
    
    if (typeof product.material === 'undefined') product.material = 0;
    if (typeof product.type === 'undefined') product.type = 0;
    
    const modal = document.getElementById("product-modal");
    modal.innerHTML = createProductForm(product);
    modal.style.display = "flex";
    
    setTimeout(() => {
      toggleMaterialDropdown();
      updateRSNPreview();
    }, 100);
  } catch (error) {
    console.error("Error loading product:", error);
    alert("Failed to load product details.");
  }
}

function showAddProductModal() {
  const modal = document.getElementById("product-modal");
  modal.innerHTML = createProductForm();
  modal.style.display = "flex";
  
  setTimeout(() => {
    toggleMaterialDropdown();
    updateRSNPreview();
  }, 100);
}

function closeProductModal() {
  document.getElementById("product-modal").style.display = "none";
}

async function handleFormSubmit(editId) {
  const isEdit = !!editId;
  const url = isEdit ? `${API_URL}/products/${editId}` : `${API_URL}/products`;
  const method = isEdit ? "PUT" : "POST";
  
  const category = document.getElementById("product-category").value;
  const gender = document.getElementById("product-gender").value;
  const tarnishValue = document.getElementById("product-tarnish").value;
  const type = (tarnishValue === "y") ? 0 : 1;
  const material = (type === 1) ? parseInt(document.getElementById("product-material").value) : 0;
  const rsn = document.getElementById("rsn-preview").value; // Get generated RSN
  const description = document.getElementById("product-description").value || "";
  
  let body, headers;
  
  if (isEdit) {
    headers = getAdminHeaders(); // <-- MODIFIED
    body = JSON.stringify({
      name: document.getElementById("product-name").value,
      price: parseFloat(document.getElementById("product-price").value),
      category: category,
      isTrending: document.getElementById("product-trending").checked ? "y" : "n",
      rsn: rsn,
      material: material,
      gender: gender,
      type: type,
      description: description
    });
  } else {
    headers = getAdminHeadersFormData(); // <-- MODIFIED
    body = new FormData();
    body.append("id", Date.now());
    body.append("name", document.getElementById("product-name").value);
    body.append("price", document.getElementById("product-price").value);
    body.append("category", category);
    body.append("isTrending", document.getElementById("product-trending").checked ? "y" : "n");
    body.append("images", document.getElementById("product-image").files[0]);
    body.append("rsn", rsn);
    body.append("material", material);
    body.append("gender", gender);
    body.append("type", type);
    body.append("description", description);
  }
  
  try {
    const response = await fetch(url, { method, headers, body });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to ${isEdit ? "update" : "add"} product`);
    }
    
    loadProductsIntoTable();
    closeProductModal();
    alert(`Product ${isEdit ? "updated" : "added"} successfully!`);
  } catch (error) {
    console.error("Error:", error);
    alert(`Failed to save product: ${error.message}`);
  }
}

async function deleteProduct(id) {
  if (!confirm("Are you sure you want to permanently delete this product?")) return;
  
  try {
    const response = await fetch(`${API_URL}/products/${id}`, { 
        method: "DELETE",
        headers: getAdminHeaders() // <-- MODIFIED
    });
    
    if (!response.ok) throw new Error("Failed to delete product");
    
    loadProductsIntoTable();
    alert("Product deleted successfully.");
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to delete product. See console for details.");
  }
}


// === NEW: ORDER MANAGEMENT ===

async function loadAdminOrders() {
    const tbody = document.getElementById("order-table-body");
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="8">Loading orders...</td></tr>';
    try {
        const response = await fetch(`${API_URL}/admin/orders`, {
            headers: getAdminHeaders()
        });
        if (!response.ok) throw new Error("Failed to fetch orders");
        
        const orders = await response.json();
        tbody.innerHTML = "";
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8">No orders found.</td></tr>';
            return;
        }

        orders.forEach(order => {
            const itemsSummary = order.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
            const address = order.shipping_address;
            const fullAddress = `${address.name}, ${address.phone}, ${address.address}, ${address.city}, ${address.pincode}`;

            const statusOptions = ['Pending', 'Paid', 'Packaging', 'Shipped', 'Delivered', 'Cancelled']
                .map(s => `<option value="${s}" ${order.status === s ? "selected" : ""}>${s}</option>`)
                .join('');
            
            tbody.innerHTML += `
                <tr>
                    <td data-label="Order ID">${order.order_id}</td>
                    <td data-label="Date">${new Date(order.created_at).toLocaleDateString()}</td>
                    <td data-label="Customer" title="${fullAddress}">${address.name}</td>
                    <td data-label="Items" title="${itemsSummary}">${itemsSummary.substring(0, 40)}...</td>
                    <td data-label="Total">₹${order.total_amount.toFixed(2)}</td>
                    <td data-label="Payment">${order.payment_status}</td>
                    <td data-label="Status">
                        <select class="admin-select" onchange="handleUpdateStatus('${order.order_id}', this.value)">
                            ${statusOptions}
                        </select>
                    </td>
                    <td data-label="Tracking">
                        <input type="text" class="admin-input" id="tracking-${order.order_id}" value="${order.tracking_link || ''}" placeholder="Enter tracking link">
                        <button class="admin-button-small" onclick="handleAddTracking('${order.order_id}')">Save</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Failed to load orders:", error);
        tbody.innerHTML = `<tr><td colspan="8">Error loading orders: ${error.message}</td></tr>`;
    }
}

async function handleUpdateStatus(orderId, status) {
    if (!confirm(`Are you sure you want to update order ${orderId} to "${status}"?`)) {
        loadAdminOrders(); // Reset dropdown if cancelled
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/admin/orders/${orderId}/update-status`, {
            method: 'PUT',
            headers: getAdminHeaders(),
            body: JSON.stringify({ status: status })
        });
        if (!response.ok) throw new Error("Failed to update status");
        alert("Status updated! The user will be notified.");
        loadAdminOrders();
    } catch (error) {
        console.error("Error updating status:", error);
        alert("Failed to update status.");
    }
}

async function handleAddTracking(orderId) {
    const trackingLink = document.getElementById(`tracking-${orderId}`).value;
    if (!trackingLink) {
        alert("Please enter a tracking link first.");
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/admin/orders/${orderId}/add-tracking`, {
            method: 'PUT',
            headers: getAdminHeaders(),
            body: JSON.stringify({ tracking_link: trackingLink })
        });
        if (!response.ok) throw new Error("Failed to add tracking");
        alert("Tracking link saved! If the order is 'Shipped', the user will be notified.");
        loadAdminOrders();
    } catch (error) {
        console.error("Error saving tracking link:", error);
        alert("Failed to save tracking link.");
    }
}
