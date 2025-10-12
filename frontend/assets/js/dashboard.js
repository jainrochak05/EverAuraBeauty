const API_URL = 'https://everaurabeauty-backend.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('login-form')) {
        document.getElementById('login-form').addEventListener('submit', handleLogin);
    } else if (document.getElementById('product-table-body')) {
        checkAuth();
        loadProductsIntoTable();
        loadPendingTestimonials(); // Load testimonials on dashboard load
        
        const navToggle = document.querySelector('.mobile-nav-toggle');
        const sidebar = document.querySelector('.dashboard-sidebar');
        if(navToggle && sidebar) { /* ... mobile nav logic ... */ }
    }
});
// --- coupon code managemnet ---
async function loadCouponsIntoTable(){const e=document.getElementById("coupon-table-body");if(!e)return;try{const t=await fetch(`${API_URL}/coupons`),o=await t.json();e.innerHTML="",o.forEach(t=>{e.innerHTML+=`
    <tr>
        <td data-label="Code">${t.code}</td>
        <td data-label="Discount">${t.discount}%</td>
        <td data-label="Actions" class="action-buttons">
            <button class="delete-btn" onclick="deleteCoupon('${t._id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </td>
    </tr>
`})}catch(t){console.error("Failed to load coupons:",t),e.innerHTML='<tr><td colspan="3">Error loading coupons.</td></tr>'}}
async function handleAddCoupon(e){e.preventDefault();const t={code:document.getElementById("coupon-code").value,discount:document.getElementById("coupon-discount").value};try{const e=await fetch(`${API_URL}/coupons`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!e.ok){const t=await e.json();throw new Error(t.error||"Failed to create coupon")}loadCouponsIntoTable(),document.getElementById("coupon-form").reset(),alert("Coupon created successfully!")}catch(e){console.error("Error:",e),alert(`Failed to create coupon: ${e.message}`)}}
async function deleteCoupon(e){confirm("Are you sure you want to delete this coupon?")&&fetch(`${API_URL}/coupons/${e}`,{method:"DELETE"}).then(e=>{e.ok?loadCouponsIntoTable():alert("Failed to delete coupon.")})}

// --- NEW: Testimonial Management Functions (Admin) ---
async function loadPendingTestimonials() {
    const tableBody = document.getElementById('pending-testimonials-body');
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_URL}/testimonials/pending`);
        const testimonials = await response.json();
        tableBody.innerHTML = '';

        if (testimonials.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">No pending testimonials.</td></tr>';
            return;
        }

        testimonials.forEach(t => {
            const row = `
                <tr>
                    <td data-label="Name">${t.name}</td>
                    <td data-label="Summary">${t.summary}</td>
                    <td data-label="Full Review">${t.full_review || 'N/A'}</td>
                    <td data-label="Actions" class="action-buttons">
                        <button class="approve-btn" onclick="approveTestimonial('${t._id}')" title="Approve"><i class="fa-solid fa-check"></i></button>
                        <button class="delete-btn" onclick="deleteTestimonial('${t._id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Failed to load testimonials:', error);
        tableBody.innerHTML = '<tr><td colspan="4">Error loading testimonials.</td></tr>';
    }
}

async function approveTestimonial(testimonialId) {
    if (confirm("Approve this testimonial to make it public?")) {
        try {
            const response = await fetch(`${API_URL}/testimonials/${testimonialId}/approve`, { method: 'PUT' });
            if (!response.ok) throw new Error('Failed to approve.');
            loadPendingTestimonials(); // Refresh the list
            alert('Testimonial approved!');
        } catch (error) {
            alert('Approval failed. Please try again.');
        }
    }
}

async function deleteTestimonial(testimonialId) {
    if (confirm("Are you sure you want to permanently delete this testimonial?")) {
        try {
            const response = await fetch(`${API_URL}/testimonials/${testimonialId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete.');
            loadPendingTestimonials(); // Refresh the list
            alert('Testimonial deleted.');
        } catch (error) {
            alert('Deletion failed. Please try again.');
        }
    }
}

// --- (All other functions for auth, products, etc., are unchanged and correct) ---
function checkAuth(){"true"!==sessionStorage.getItem("isAdminLoggedIn")&&window.location.replace("admin.html")}function handleLogin(e){e.preventDefault();const t=document.getElementById("username").value,o=document.getElementById("password").value;"admin"===t&&"password123"===o?(sessionStorage.setItem("isAdminLoggedIn","true"),window.location.href="dashboard.html"):alert("Invalid credentials. Please try again.")}function logout(){sessionStorage.removeItem("isAdminLoggedIn"),window.location.replace("admin.html")}
async function loadProductsIntoTable(){const e=document.getElementById("product-table-body");if(!e)return;try{const t=await fetch(`${API_URL}/products`);if(!t.ok)throw new Error("Failed to fetch products");const o=await t.json();e.innerHTML="",o.sort((e,t)=>e.id-t.id).forEach(t=>{const o=t.images&&t.images.length>0?t.images[0]:"https://via.placeholder.com/50x50/1D1D1D/EAEAEA?text=No+Img";e.innerHTML+=`
                <tr>
                    <td data-label="Image"><img src="${o}" alt="${t.name}" class="table-product-image"></td>
                    <td data-label="Name">${t.name}</td>
                    <td data-label="Price">₹${t.price.toFixed(2)}</td>
                    <td data-label="Category">${t.category||"N/A"}</td>
                    <td data-label="Trending">${"y"===t.isTrending?"Yes":"No"}</td>
                    <td data-label="Actions" class="action-buttons">
                        <button class="edit-btn" onclick="showEditProductModal('${t._id}')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="delete-btn" onclick="deleteProduct('${t._id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `})}catch(t){console.error("Failed to load products:",t),e.innerHTML='<tr><td colspan="6">Error loading products. Is the backend server running?</td></tr>'}}


// A redesigned function to generate a much cleaner form
function createProductForm(product = {}) {
    const isEdit = !!product._id;
    const title = isEdit ? `Edit Product (ID: ${product.id})` : "Add New Product";

    // This HTML structure is cleaner and uses classes for better styling
    return `
        <div class="modal-content">
            <button class="modal-close-btn" onclick="closeProductModal()">&times;</button>
            <h3>${title}</h3>
            <form id="product-form" onsubmit="event.preventDefault(); handleFormSubmit('${product._id || ''}')">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="product-id">Product ID</label>
                        <input type="number" id="product-id" value="${product.id || ''}" ${isEdit ? 'disabled' : ''} required>
                    </div>
                    <div class="form-group">
                        <label for="product-name">Name</label>
                        <input type="text" id="product-name" value="${product.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="product-price">Price</label>
                        <input type="number" id="product-price" value="${product.price || ''}" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label for="product-category">Main Category</label>
                        <select id="product-category" required>
                            <option value="Necklaces" ${product.category === 'Necklaces' ? 'selected' : ''}>Necklaces</option>
                            <option value="Earrings" ${product.category === 'Earrings' ? 'selected' : ''}>Earrings</option>
                            <option value="Rings" ${product.category === 'Rings' ? 'selected' : ''}>Rings</option>
                            <option value="Bangles/Bracelets" ${product.category === 'Bangles/Bracelets' ? 'selected' : ''}>Bangles/Bracelets</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="product-tarnish">Tarnish Type</label>
                        <select id="product-tarnish" required>
                            <option value="y" ${product.isAntiTarnish === 'y' ? 'selected' : ''}>Anti-Tarnish</option>
                            <option value="n" ${!product.isAntiTarnish || product.isAntiTarnish === 'n' ? 'selected' : ''}>Tarnish</option>
                        </select>
                    </div>
                     <div class="form-group form-group-checkbox">
                        <input type="checkbox" id="product-trending" ${product.isTrending === 'y' ? 'checked' : ''}>
                        <label for="product-trending">Is Trending?</label>
                    </div>
                </div>
                
                ${!isEdit ? `
                <div class="form-group">
                    <label for="product-image">Product Image (Primary)</label>
                    <input type="file" id="product-image" name="image" accept="image/*" required>
                </div>` : ''}
                
                <button type="submit" class="cta-button admin-button">${isEdit ? "Save Changes" : "Add Product"}</button>
            </form>
        </div>`;
}






async function showEditProductModal(e){const t=await fetch(`${API_URL}/products`),o=await t.json(),a=o.find(t=>t._id===e);if(!a)return void alert("Product not found!");const d=document.getElementById("product-modal");d.innerHTML=createProductForm(a),d.style.display="flex"}
function showAddProductModal(){const e=document.getElementById("product-modal");e.innerHTML=createProductForm(),e.style.display="flex"}function closeProductModal(){document.getElementById("product-modal").style.display="none"}async function handleFormSubmit(e){const t=!!e,o=t?`${API_URL}/products/${e}`:`${API_URL}/products`,a=t?"PUT":"POST";let d,n;if(t)n={"Content-Type":"application/json"},d=JSON.stringify({name:document.getElementById("product-name").value,price:parseFloat(document.getElementById("product-price").value),category:document.getElementById("product-category").value,isAntiTarnish:document.getElementById("product-tarnish").value,isTrending:document.getElementById("product-trending").checked?"y":"n"});else{n={},d=new FormData;d.append("id",document.getElementById("product-id").value),d.append("name",document.getElementById("product-name").value),d.append("price",document.getElementById("product-price").value),d.append("category",document.getElementById("product-category").value),d.append("isAntiTarnish",document.getElementById("product-tarnish").value),d.append("isTrending",document.getElementById("product-trending").checked?"y":"n"),d.append("images",document.getElementById("product-image").files[0])}try{const e=await fetch(o,{method:a,headers:n,body:d});if(!e.ok){const t=await e.json();throw new Error(t.error||`Failed to ${t?"update":"add"} product`)}loadProductsIntoTable(),closeProductModal(),alert(`Product ${t?"updated":"added"} successfully!`)}catch(e){console.error("Error:",e),alert(`Failed to save product: ${e.message}`)}}async function deleteProduct(e){if(confirm("Are you sure you want to permanently delete this product?"))try{const t=await fetch(`${API_URL}/products/${e}`,{method:"DELETE"});if(!t.ok)throw new Error("Failed to delete product");loadProductsIntoTable(),alert("Product deleted successfully.")}catch(e){console.error("Error:",e),alert("Failed to delete product. See console for details.")}}
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("coupon-form").addEventListener("submit", handleAddCoupon);
    loadCouponsIntoTable(); // optional: load existing coupons on page load
});
