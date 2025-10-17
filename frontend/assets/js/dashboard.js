const API_URL = "https://everaurabeauty-backend.onrender.com/api";

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("login-form")) {
    document
      .getElementById("login-form")
      .addEventListener("submit", handleLogin);
  } else if (document.getElementById("product-table-body")) {
    checkAuth();
    loadProductsIntoTable();
    loadPendingTestimonials(); // Load testimonials on dashboard load
    loadAllTestimonials(); // Load all testimonials section

    const navToggle = document.querySelector(".mobile-nav-toggle");
    const sidebar = document.querySelector(".dashboard-sidebar");
    if (navToggle && sidebar) {
      /* ... mobile nav logic ... */
    }
  }
});
// --- coupon code managemnet ---
async function loadCouponsIntoTable() {
  const e = document.getElementById("coupon-table-body");
  if (!e) return;
  try {
    const t = await fetch(`${API_URL}/coupons`),
      o = await t.json();
    (e.innerHTML = ""),
      o.forEach((t) => {
        e.innerHTML += `
    <tr>
        <td data-label="Code">${t.code}</td>
        <td data-label="Discount">${t.discount}%</td>
        <td data-label="Actions" class="action-buttons">
            <button class="delete-btn" onclick="deleteCoupon('${t._id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </td>
    </tr>
`;
      });
  } catch (t) {
    console.error("Failed to load coupons:", t),
      (e.innerHTML = '<tr><td colspan="3">Error loading coupons.</td></tr>');
  }
}
async function handleAddCoupon(e) {
  e.preventDefault();
  const t = {
    code: document.getElementById("coupon-code").value,
    discount: document.getElementById("coupon-discount").value,
  };
  try {
    const e = await fetch(`${API_URL}/coupons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t),
    });
    if (!e.ok) {
      const t = await e.json();
      throw new Error(t.error || "Failed to create coupon");
    }
    loadCouponsIntoTable(),
      document.getElementById("coupon-form").reset(),
      alert("Coupon created successfully!");
  } catch (e) {
    console.error("Error:", e), alert(`Failed to create coupon: ${e.message}`);
  }
}
async function deleteCoupon(e) {
  confirm("Are you sure you want to delete this coupon?") &&
    fetch(`${API_URL}/coupons/${e}`, { method: "DELETE" }).then((e) => {
      e.ok ? loadCouponsIntoTable() : alert("Failed to delete coupon.");
    });
}

// --- NEW: Testimonial Management Functions (Admin) ---
async function loadPendingTestimonials() {
  const tableBody = document.getElementById("pending-testimonials-body");
  if (!tableBody) return;

  try {
    const response = await fetch(`${API_URL}/testimonials/pending`);
    const testimonials = await response.json();
    tableBody.innerHTML = "";

    if (testimonials.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="4">No pending testimonials.</td></tr>';
      return;
    }

    testimonials.forEach((t) => {
      const row = `
                <tr>
                    <td data-label="Name">${t.name}</td>
                    <td data-label="Summary">${t.summary}</td>
                    <td data-label="Full Review">${t.full_review || "N/A"}</td>
                    <td data-label="Actions" class="action-buttons">
                        <button class="approve-btn" onclick="approveTestimonial('${
                          t._id
                        }')" title="Approve"><i class="fa-solid fa-check"></i></button>
                        <button class="delete-btn" onclick="deleteTestimonial('${
                          t._id
                        }')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
      tableBody.innerHTML += row;
    });
  } catch (error) {
    console.error("Failed to load testimonials:", error);
    tableBody.innerHTML =
      '<tr><td colspan="4">Error loading testimonials.</td></tr>';
  }
}

async function approveTestimonial(testimonialId) {
  if (confirm("Approve this testimonial to make it public?")) {
    try {
      const response = await fetch(
        `${API_URL}/testimonials/${testimonialId}/approve`,
        { method: "PUT" }
      );
      if (!response.ok) throw new Error("Failed to approve.");
      loadPendingTestimonials(); // Refresh the list
      alert("Testimonial approved!");
    } catch (error) {
      alert("Approval failed. Please try again.");
    }
  }
}

async function deleteTestimonial(testimonialId) {
  if (
    confirm("Are you sure you want to permanently delete this testimonial?")
  ) {
    try {
      const response = await fetch(`${API_URL}/testimonials/${testimonialId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete.");
      loadPendingTestimonials(); // Refresh the pending list
      if (typeof loadAllTestimonials === "function") {
        loadAllTestimonials(); // Refresh the all testimonials list
      }
      alert("Testimonial deleted.");
    } catch (error) {
      alert("Deletion failed. Please try again.");
    }
  }
}

// --- NEW: Load All Testimonials Section ---
async function loadAllTestimonials() {
  const tableBody = document.getElementById("all-testimonials-body");
  if (!tableBody) return;

  try {
    const response = await fetch(`${API_URL}/testimonials`);
    const testimonials = await response.json();
    tableBody.innerHTML = "";

    if (!Array.isArray(testimonials) || testimonials.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="5">No testimonials found.</td></tr>';
      return;
    }

    testimonials.forEach((t) => {
      const status = t.isApproved ? "Approved" : "Pending";
      const row = `
        <tr>
          <td data-label="Name">${t.name}</td>
          <td data-label="Summary">${t.summary}</td>
          <td data-label="Full Review">${t.full_review || "N/A"}</td>
          <td data-label="Status">${status}</td>
          <td data-label="Actions" class="action-buttons">
            <button class="delete-btn" onclick="deleteTestimonial('${t._id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `;
      tableBody.innerHTML += row;
    });
  } catch (error) {
    console.error("Failed to load all testimonials:", error);
    tableBody.innerHTML =
      '<tr><td colspan="5">Error loading testimonials.</td></tr>';
  }
}

// --- (All other functions for auth, products, etc., are unchanged and correct) ---
function checkAuth() {
  "true" !== sessionStorage.getItem("isAdminLoggedIn") &&
    window.location.replace("admin.html");
}
function handleLogin(e) {
  e.preventDefault();
  const t = document.getElementById("username").value,
    o = document.getElementById("password").value;
  "admin" === t && "password123" === o
    ? (sessionStorage.setItem("isAdminLoggedIn", "true"),
      (window.location.href = "dashboard.html"))
    : alert("Invalid credentials. Please try again.");
}
function logout() {
  sessionStorage.removeItem("isAdminLoggedIn"),
    window.location.replace("admin.html");
}
async function loadProductsIntoTable() {
  const e = document.getElementById("product-table-body");
  if (!e) return;
  try {
    const t = await fetch(`${API_URL}/products`);
    if (!t.ok) throw new Error("Failed to fetch products");
    const o = await t.json();
    (e.innerHTML = ""),
      o
        .sort((a, b) => {
          // Sort by RSN (as string, since it's unique and numeric-like)
          if (a.rsn && b.rsn) return a.rsn.localeCompare(b.rsn);
          return 0;
        })
        .forEach((t) => {
          const o =
            t.images && t.images.length > 0
              ? t.images[0]
              : "https://via.placeholder.com/50x50/1D1D1D/EAEAEA?text=No+Img";
          e.innerHTML += `
                <tr>
                    <td data-label="Image"><img src="${o}" alt="${
            t.name
          }" class="table-product-image"></td>
                    <td data-label="RSN">${t.rsn || "N/A"}</td>
                    <td data-label="Name">${t.name}</td>
                    <td data-label="Price">₹${t.price.toFixed(2)}</td>
                    <td data-label="Category">${t.category || "N/A"}</td>
                    <td data-label="Trending">${
                      "y" === t.isTrending ? "Yes" : "No"
                    }</td>
                    <td data-label="Actions" class="action-buttons">
                        <button class="edit-btn" onclick="showEditProductModal('${
                          t._id
                        }')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="delete-btn" onclick="deleteProduct('${
                          t._id
                        }')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
  } catch (t) {
    console.error("Failed to load products:", t),
      (e.innerHTML =
        '<tr><td colspan="6">Error loading products. Is the backend server running?</td></tr>');
  }
}

// A redesigned function to generate a much cleaner form
function createProductForm(product = {}) {
  const isEdit = !!product._id;
  const title = isEdit
    ? `Edit Product (RSN: ${product.rsn || "N/A"})`
    : "Add New Product";

  // Default gender for new product is "0" (Her)
  const genderValue = typeof product.gender !== "undefined" ? product.gender : "0";

  // This HTML structure is cleaner and uses classes for better styling
  return `
        <div class="modal-content">
            <button class="modal-close-btn" onclick="closeProductModal()">&times;</button>
            <h3>${title}</h3>
            <form id="product-form" onsubmit="event.preventDefault(); handleFormSubmit('${
              product._id || ""
            }')">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="product-name">Name</label>
                        <input type="text" id="product-name" value="${
                          product.name || ""
                        }" required>
                    </div>
                    <div class="form-group">
                        <label for="product-price">Price</label>
                        <input type="number" id="product-price" value="${
                          product.price || ""
                        }" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label for="product-category">Main Category</label>
                        <select id="product-category" required onchange="toggleMaterialDropdown(); updateRSNPreview();">
                            <option value="Necklaces" ${
                              product.category === "Necklaces" ? "selected" : ""
                            }>Necklaces</option>
                            <option value="Earrings" ${
                              product.category === "Earrings" ? "selected" : ""
                            }>Earrings</option>
                            <option value="Rings" ${
                              product.category === "Rings" ? "selected" : ""
                            }>Rings</option>
                            <option value="Bangles/Bracelets" ${
                              product.category === "Bangles/Bracelets"
                                ? "selected"
                                : ""
                            }>Bangles/Bracelets</option>
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
                        <select id="product-tarnish" required onchange="updateRSNPreview();">
                            <option value="y" ${
                              product.isAntiTarnish === "y" ? "selected" : ""
                            }>Anti-Tarnish</option>
                            <option value="n" ${
                              !product.isAntiTarnish ||
                              product.isAntiTarnish === "n"
                                ? "selected"
                                : ""
                            }>Tarnish</option>
                        </select>
                    </div>
                    <div class="form-group form-group-checkbox">
                        <input type="checkbox" id="product-trending" ${
                          product.isTrending === "y" ? "checked" : ""
                        }>
                        <label for="product-trending">Is Trending?</label>
                    </div>
                    <div class="form-group" id="material-dropdown-container" style="display:none;">
                        <label for="product-material">Material</label>
                        <select id="product-material" onchange="updateRSNPreview();">
                            <option value="0" ${
                              product.material === "0" ? "selected" : ""
                            }>Anti Tarnish</option>
                            <option value="1" ${
                              product.material === "1" ? "selected" : ""
                            }>Meenakari</option>
                            <option value="2" ${
                              product.material === "2" ? "selected" : ""
                            }>Kundan</option>
                            <option value="3" ${
                              product.material === "3" ? "selected" : ""
                            }>American Diamond</option>
                            <option value="4" ${
                              product.material === "4" ? "selected" : ""
                            }>Resin</option>
                        </select>
                    </div>
                    <div class="form-group">
                      <label for="rsn-preview">RSN Preview</label>
                      <input type="text" id="rsn-preview" readonly style="background:#eee; border:1px solid #ccc; padding:5px;">
                    </div>
                </div>
                
                ${
                  !isEdit
                    ? `
                <div class="form-group">
                    <label for="product-image">Product Image (Primary)</label>
                    <input type="file" id="product-image" name="image" accept="image/*" required>
                </div>`
                    : ""
                }
                
                <button type="submit" class="cta-button admin-button">${
                  isEdit ? "Save Changes" : "Add Product"
                }</button>
            </form>
        </div>
        <script>
          // Initialize material dropdown visibility and RSN preview on load
          document.addEventListener('DOMContentLoaded', () => {
            toggleMaterialDropdown();
            updateRSNPreview();
          });
        </script>
    `;
}

function toggleMaterialDropdown() {
  const category = document.getElementById("product-category").value;
  const materialContainer = document.getElementById("material-dropdown-container");
  if (!materialContainer) return;
  // Show material dropdown only if category is "Necklaces" or "Earrings" or "Rings" or "Bangles/Bracelets" but as per instructions visible only if category type = "Jewelry"
  // The instructions say visible when Category Type = "Jewelry" but category options are Necklaces, Earrings, Rings, Bangles/Bracelets
  // Assuming "Jewelry" means all those categories, but instructions say visible only when Category Type = "Jewelry" - but no explicit "Jewelry" category.
  // We'll assume "Necklaces", "Earrings", "Rings", and "Bangles/Bracelets" all count as Jewelry, so always show material dropdown.
  // But instructions say hidden by default, visible when Category Type = "Jewelry"
  // So to follow instructions literally, let's assume "Jewelry" means all these categories, so always visible.
  // But instructions say hidden by default, visible when Category Type = "Jewelry"
  // So for safety, show material dropdown only for these categories:
  const jewelryCategories = ["Necklaces", "Earrings", "Rings", "Bangles/Bracelets"];
  if (jewelryCategories.includes(category)) {
    materialContainer.style.display = "block";
  } else {
    materialContainer.style.display = "none";
  }
}

async function getNextArticleNumber(categoryCode, typeCode) {
  // Fetch existing products to determine next article number for given category and type
  try {
    const response = await fetch(`${API_URL}/products`);
    if (!response.ok) throw new Error("Failed to fetch products");
    const products = await response.json();
    // Filter products by category and type (type: 0=Anti Tarnish, 1=Jewelry)
    // typeCode 0 means Anti Tarnish, 1 means Jewelry (per RSN logic)
    // Determine type from product.isAntiTarnish: "y" means Anti Tarnish (0), "n" means Jewelry (1)
    const filtered = products.filter(p => {
      const pCategoryCode = getCategoryCode(p.category);
      const pTypeCode = p.isAntiTarnish === "y" ? "0" : "1";
      return pCategoryCode === categoryCode && pTypeCode === typeCode;
    });
    // Extract article number from RSN if exists, else from product id or 0
    // RSN is 8 digits, last 4 digits are article number
    let maxArticleNum = 0;
    filtered.forEach(p => {
      if (p.rsn && p.rsn.length === 8) {
        const artNum = parseInt(p.rsn.slice(4), 10);
        if (artNum > maxArticleNum) maxArticleNum = artNum;
      }
    });
    return (maxArticleNum + 1).toString().padStart(4, "0");
  } catch (error) {
    console.error("Error fetching products for article number:", error);
    return "0001";
  }
}

function getCategoryCode(category) {
  // Map categories to codes:
  // Earrings = 1
  // Bangles/Bracelets = 2
  // Necklace = 3
  // Rings = 4
  switch (category) {
    case "Earrings":
      return "1";
    case "Bangles/Bracelets":
      return "2";
    case "Necklaces":
      return "3";
    case "Rings":
      return "4";
    default:
      return "0";
  }
}

async function generateRSN(category, gender, type, material) {
  // category: string category name
  // gender: "0" or "1" ("0"=Her, "1"=Him)
  // type: "0" or "1" (0=Anti Tarnish, 1=Jewelry)
  // material: "0" to "4"
  const categoryCode = getCategoryCode(category);
  if (categoryCode === "0") return "";
  // 5th-8th digits are article number auto-incremented based on category + type
  const articleNumber = await getNextArticleNumber(categoryCode, type);
  return `${categoryCode}${gender}${type}${material}${articleNumber}`;
}

function updateRSNPreview() {
  const category = document.getElementById("product-category").value;
  // Get gender from form
  const genderSelect = document.getElementById("product-gender");
  const gender = genderSelect ? genderSelect.value : "0";
  const tarnishValue = document.getElementById("product-tarnish").value;
  // type: 0=Anti Tarnish, 1=Jewelry
  const type = tarnishValue === "y" ? "0" : "1";

  let material = "0"; // default to Anti Tarnish
  const materialContainer = document.getElementById("material-dropdown-container");
  if (materialContainer && materialContainer.style.display !== "none") {
    const materialSelect = document.getElementById("product-material");
    if (materialSelect) {
      material = materialSelect.value;
    }
  }

  // We cannot await in event handler easily, so use async IIFE
  (async () => {
    const rsn = await generateRSN(category, gender, type, material);
    const previewInput = document.getElementById("rsn-preview");
    if (previewInput) {
      previewInput.value = rsn;
    }
  })();
}

async function showEditProductModal(e) {
  const t = await fetch(`${API_URL}/products`),
    o = await t.json(),
    a = o.find((t) => t._id === e);
  if (!a) return void alert("Product not found!");
  // Set product.material for form select pre-selection, default to "0" if missing
  if (!a.material) {
    a.material = "0";
  }
  const d = document.getElementById("product-modal");
  (d.innerHTML = createProductForm(a)), (d.style.display = "flex");
  // After modal shown, set up event listeners for toggling and RSN preview
  toggleMaterialDropdown();
  updateRSNPreview();
}
function showAddProductModal() {
  const e = document.getElementById("product-modal");
  (e.innerHTML = createProductForm()), (e.style.display = "flex");
  toggleMaterialDropdown();
  updateRSNPreview();
}
function closeProductModal() {
  document.getElementById("product-modal").style.display = "none";
}
async function handleFormSubmit(editId) {
  const isEdit = !!editId;
  const url = isEdit ? `${API_URL}/products/${editId}` : `${API_URL}/products`;
  const method = isEdit ? "PUT" : "POST";
  let body, headers;
  // Get form values
  const category = document.getElementById("product-category").value;
  // Read gender from the dropdown
  const genderSelect = document.getElementById("product-gender");
  const gender = genderSelect ? genderSelect.value : "0";
  const tarnishValue = document.getElementById("product-tarnish").value;
  const type = tarnishValue === "y" ? "0" : "1";
  let material = "0";
  const materialContainer = document.getElementById("material-dropdown-container");
  if (materialContainer && materialContainer.style.display !== "none") {
    const materialSelect = document.getElementById("product-material");
    if (materialSelect) {
      material = materialSelect.value;
    }
  }
  // Generate RSN (always used as product ID)
  const rsn = await generateRSN(category, gender, type, material);

  if (isEdit) {
    headers = { "Content-Type": "application/json" };
    body = JSON.stringify({
      name: document.getElementById("product-name").value,
      price: parseFloat(document.getElementById("product-price").value),
      category: category,
      isAntiTarnish: tarnishValue,
      isTrending: document.getElementById("product-trending").checked ? "y" : "n",
      rsn: rsn,
      material: material,
      gender: gender
    });
  } else {
    headers = {};
    body = new FormData();
    // Do NOT append a numeric product-id (removed)
    body.append("name", document.getElementById("product-name").value);
    body.append("price", document.getElementById("product-price").value);
    body.append("category", category);
    body.append("isAntiTarnish", tarnishValue);
    body.append(
      "isTrending",
      document.getElementById("product-trending").checked ? "y" : "n"
    );
    body.append("images", document.getElementById("product-image").files[0]);
    body.append("rsn", rsn);
    body.append("material", material);
    body.append("gender", gender);
  }
  try {
    const resp = await fetch(url, { method, headers, body });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || `Failed to ${isEdit ? "update" : "add"} product`);
    }
    loadProductsIntoTable(),
      closeProductModal(),
      alert(`Product ${isEdit ? "updated" : "added"} successfully!`);
  } catch (e) {
    console.error("Error:", e), alert(`Failed to save product: ${e.message}`);
  }
}
async function deleteProduct(e) {
  if (confirm("Are you sure you want to permanently delete this product?"))
    try {
      const t = await fetch(`${API_URL}/products/${e}`, { method: "DELETE" });
      if (!t.ok) throw new Error("Failed to delete product");
      loadProductsIntoTable(), alert("Product deleted successfully.");
    } catch (e) {
      console.error("Error:", e),
        alert("Failed to delete product. See console for details.");
    }
}
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("coupon-form")
    .addEventListener("submit", handleAddCoupon);
  loadCouponsIntoTable(); // optional: load existing coupons on page load
});
