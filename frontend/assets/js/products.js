// !IMPORTANT: Match backend ADMIN_KEY
const ADMIN_KEY = "admineveraura2025";

const API_URL = "https://everaura-backend.vercel.app/api";

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadProductsIntoTable();
});


// =====================================================
// ADMIN
// =====================================================

function getAdminHeaders() {
  return {
    "Content-Type": "application/json",
    "X-ADMIN-KEY": ADMIN_KEY,
  };
}

function getAdminHeadersFormData() {
  return {
    "X-ADMIN-KEY": ADMIN_KEY,
  };
}

function checkAuth() {
  if (sessionStorage.getItem("isAdminLoggedIn") !== "true") {
    window.location.replace("admin.html");
  }
}

function logout() {
  sessionStorage.removeItem("isAdminLoggedIn");
  window.location.replace("admin.html");
}


// =====================================================
// LOAD PRODUCTS
// =====================================================

async function loadProductsIntoTable() {
  const tbody = document.getElementById("product-table-body");

  if (!tbody) return;

  try {
    const response = await fetch(`${API_URL}/products`);

    if (!response.ok) {
      throw new Error("Failed to fetch products");
    }

    const products = await response.json();

    tbody.innerHTML = "";

    if (!products.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11">No products found.</td>
        </tr>
      `;

      return;
    }

    products
      .sort((a, b) => {
        if (a.rsn && b.rsn) {
          return a.rsn.localeCompare(b.rsn);
        }

        return 0;
      })
      .forEach((product) => {
        const imageUrl =
          product.images && product.images.length > 0
            ? product.images[0]
            : "";

        const genderDisplay =
          product.gender === "0"
            ? "Her"
            : product.gender === "1"
            ? "Him"
            : "N/A";

        const typeDisplay =
          Number(product.type) === 0
            ? "Anti-Tarnish"
            : Number(product.type) === 1
            ? "Jewelry"
            : "N/A";

        const quantity = Number(product.quantity || 0);

        let stockStatus;

        if (quantity <= 0) {
          stockStatus = `
            <span class="stock-status stock-out">
              Out of Stock
            </span>
          `;
        } else if (quantity <= 5) {
          stockStatus = `
            <span class="stock-status stock-low">
              Low Stock
            </span>
          `;
        } else {
          stockStatus = `
            <span class="stock-status stock-available">
              In Stock
            </span>
          `;
        }

        tbody.innerHTML += `
          <tr>

            <td data-label="Image">
              <img
                src="${imageUrl}"
                alt="${product.name}"
                class="table-product-image"
              >
            </td>

            <td data-label="RSN">
              ${product.rsn || "N/A"}
            </td>

            <td data-label="Name">
              ${product.name}
            </td>

            <td data-label="Price">
              ₹${Number(product.price).toFixed(2)}
            </td>

            <td data-label="Quantity">
              <strong>${quantity}</strong>
            </td>

            <td data-label="Stock Status">
              ${stockStatus}
            </td>

            <td data-label="Category">
              ${product.category || "N/A"}
            </td>

            <td data-label="Gender">
              ${genderDisplay}
            </td>

            <td data-label="Type">
              ${typeDisplay}
            </td>

            <td data-label="Trending">
              ${product.isTrending === "y" ? "Yes" : "No"}
            </td>

            <td
              data-label="Actions"
              class="action-buttons"
            >

              <button
                class="edit-btn"
                onclick="showEditProductModal('${product._id}')"
                title="Edit Product"
              >
                <i class="fa-solid fa-pen-to-square"></i>
              </button>

              <button
                class="delete-btn"
                onclick="deleteProduct('${product._id}')"
                title="Delete Product"
              >
                <i class="fa-solid fa-trash"></i>
              </button>

            </td>

          </tr>
        `;
      });

  } catch (error) {
    console.error("Failed to load products:", error);

    tbody.innerHTML = `
      <tr>
        <td colspan="11">
          Error loading products.
        </td>
      </tr>
    `;
  }
}


// =====================================================
// PRODUCT FORM
// =====================================================

function createProductForm(product = {}) {
  const isEdit = !!product._id;

  const title = isEdit
    ? `Edit Product (RSN: ${product.rsn || "N/A"})`
    : "Add New Product";

  const genderValue =
    typeof product.gender !== "undefined"
      ? product.gender
      : "0";

  const typeValue =
    typeof product.type !== "undefined"
      ? Number(product.type)
      : 0;

  const materialValue =
    typeof product.material !== "undefined"
      ? Number(product.material)
      : 0;

  const tarnishValue =
    typeValue === 0 ? "y" : "n";

  return `
    <div class="modal-content">

      <button
        class="modal-close-btn"
        onclick="closeProductModal()"
      >
        &times;
      </button>

      <h3>${title}</h3>

      <form
        id="product-form"
        onsubmit="
          event.preventDefault();
          handleFormSubmit('${product._id || ""}')
        "
      >

        <div class="form-grid">

          <div class="form-group">
            <label for="product-name">
              Name
            </label>

            <input
              type="text"
              id="product-name"
              value="${product.name || ""}"
              required
            >
          </div>


          <div class="form-group">
            <label for="product-price">
              Price
            </label>

            <input
              type="number"
              id="product-price"
              value="${product.price || ""}"
              step="0.01"
              min="0"
              required
            >
          </div>


          <div class="form-group">
            <label for="product-quantity">
              ${isEdit ? "Available Quantity" : "Initial Quantity"}
            </label>

            <input
              type="number"
              id="product-quantity"
              value="${product.quantity ?? 0}"
              min="0"
              step="1"
              required
            >
          </div>


          <div class="form-group">

            <label for="product-category">
              Main Category
            </label>

            <select
              id="product-category"
              required
              onchange="updateRSNPreview();"
            >

              <option
                value="Necklaces"
                ${product.category === "Necklaces" ? "selected" : ""}
              >
                Necklaces
              </option>

              <option
                value="Earrings"
                ${product.category === "Earrings" ? "selected" : ""}
              >
                Earrings
              </option>

              <option
                value="Rings"
                ${product.category === "Rings" ? "selected" : ""}
              >
                Rings
              </option>

              <option
                value="Bangles/Bracelets"
                ${
                  product.category === "Bangles/Bracelets"
                    ? "selected"
                    : ""
                }
              >
                Bangles/Bracelets
              </option>

            </select>

          </div>


          <div class="form-group">

            <label for="product-gender">
              Gender
            </label>

            <select
              id="product-gender"
              onchange="updateRSNPreview();"
            >

              <option
                value="0"
                ${genderValue === "0" ? "selected" : ""}
              >
                Her
              </option>

              <option
                value="1"
                ${genderValue === "1" ? "selected" : ""}
              >
                Him
              </option>

            </select>

          </div>


          <div class="form-group">

            <label for="product-tarnish">
              Tarnish Type
            </label>

            <select
              id="product-tarnish"
              required
              onchange="
                toggleMaterialDropdown();
                updateRSNPreview();
              "
            >

              <option
                value="y"
                ${tarnishValue === "y" ? "selected" : ""}
              >
                Anti-Tarnish
              </option>

              <option
                value="n"
                ${tarnishValue === "n" ? "selected" : ""}
              >
                Jewelry
              </option>

            </select>

          </div>


          <div
            class="form-group"
            id="material-dropdown-container"
            style="display:none;"
          >

            <label for="product-material">
              Material
            </label>

            <select
              id="product-material"
              onchange="updateRSNPreview();"
            >

              <option value="0" ${materialValue === 0 ? "selected" : ""}>
                Anti Tarnish
              </option>

              <option value="1" ${materialValue === 1 ? "selected" : ""}>
                Meenakari
              </option>

              <option value="2" ${materialValue === 2 ? "selected" : ""}>
                Kundan
              </option>

              <option value="3" ${materialValue === 3 ? "selected" : ""}>
                American Diamond
              </option>

              <option value="4" ${materialValue === 4 ? "selected" : ""}>
                Resin
              </option>

              <option value="5" ${materialValue === 5 ? "selected" : ""}>
                Chandbali
              </option>

              <option value="6" ${materialValue === 6 ? "selected" : ""}>
                Chanderi
              </option>

              <option value="7" ${materialValue === 7 ? "selected" : ""}>
                Pearl
              </option>

            </select>

          </div>


          <div class="form-group">

            <label for="rsn-preview">
              RSN Preview (Auto-generated)
            </label>

            <input
              type="text"
              id="rsn-preview"
              value="${product.rsn || ""}"
              readonly
              style="
                background:#2a2a2a;
                border:1px solid #444;
                color:#888;
              "
            >

          </div>


          <div class="form-group form-group-checkbox">

            <input
              type="checkbox"
              id="product-trending"
              ${product.isTrending === "y" ? "checked" : ""}
            >

            <label for="product-trending">
              Is Trending?
            </label>

          </div>

        </div>


        <div class="form-group">

          <label for="product-description">
            Product Description
          </label>

          <textarea
            id="product-description"
            rows="4"
            placeholder="Enter product description..."
          >${product.description || ""}</textarea>

        </div>


        ${
          !isEdit
            ? `
          <div class="form-group">

            <label for="product-image">
              Product Image (Primary)
            </label>

            <input
              type="file"
              id="product-image"
              name="image"
              accept="image/*"
              required
            >

          </div>
        `
            : ""
        }


        <button
          type="submit"
          class="cta-button admin-button"
        >
          ${isEdit ? "Save Changes" : "Add Product"}
        </button>

      </form>

    </div>
  `;
}


// =====================================================
// MATERIAL
// =====================================================

function toggleMaterialDropdown() {
  const tarnish =
    document.getElementById("product-tarnish");

  const materialContainer =
    document.getElementById(
      "material-dropdown-container"
    );

  if (!materialContainer || !tarnish) return;

  materialContainer.style.display =
    tarnish.value === "n"
      ? "block"
      : "none";
}


// =====================================================
// RSN
// =====================================================

function getCategoryCode(category) {
  const map = {
    Earrings: "1",
    "Bangles/Bracelets": "2",
    Necklaces: "3",
    Rings: "4",
  };

  return map[category] || "0";
}


async function getNextArticleNumber(prefix) {
  try {
    const response =
      await fetch(`${API_URL}/products`);

    if (!response.ok) {
      throw new Error("Failed to fetch products");
    }

    const products = await response.json();

    const filtered = products.filter(
      (product) =>
        product.rsn &&
        product.rsn.startsWith(prefix)
    );

    let maxArticleNum = 0;

    filtered.forEach((product) => {
      const articleNumber = parseInt(
        product.rsn.slice(-4),
        10
      );

      if (
        !isNaN(articleNumber) &&
        articleNumber > maxArticleNum
      ) {
        maxArticleNum = articleNumber;
      }
    });

    return (maxArticleNum + 1)
      .toString()
      .padStart(4, "0");

  } catch (error) {
    console.error(
      "Error fetching products for article number:",
      error
    );

    return "0001";
  }
}


async function generateRSN(
  category,
  gender,
  type,
  material
) {
  const categoryCode =
    getCategoryCode(category);

  const genderCode =
    gender || "0";

  const typeCode =
    type || "0";

  const materialCode =
    type === "1"
      ? material || "0"
      : "0";

  const prefix =
    `${categoryCode}${genderCode}${typeCode}${materialCode}`;

  const nextArticleNumber =
    await getNextArticleNumber(prefix);

  return `${prefix}${nextArticleNumber}`;
}


async function updateRSNPreview() {
  const category =
    document.getElementById(
      "product-category"
    )?.value;

  const gender =
    document.getElementById(
      "product-gender"
    )?.value;

  const tarnishValue =
    document.getElementById(
      "product-tarnish"
    )?.value;

  const type =
    tarnishValue === "y"
      ? "0"
      : "1";

  let material = "0";

  if (type === "1") {
    material =
      document.getElementById(
        "product-material"
      )?.value || "0";
  }

  const rsn = await generateRSN(
    category,
    gender,
    type,
    material
  );

  const previewInput =
    document.getElementById("rsn-preview");

  if (previewInput) {
    previewInput.value = rsn;
  }
}


// =====================================================
// MODAL
// =====================================================

async function showEditProductModal(id) {
  try {
    const response =
      await fetch(`${API_URL}/products`);

    const products =
      await response.json();

    const product =
      products.find(
        (product) => product._id === id
      );

    if (!product) {
      alert("Product not found!");
      return;
    }

    const modal =
      document.getElementById(
        "product-modal"
      );

    modal.innerHTML =
      createProductForm(product);

    modal.style.display = "flex";

    setTimeout(() => {
      toggleMaterialDropdown();
    }, 100);

  } catch (error) {
    console.error(
      "Error loading product:",
      error
    );

    alert(
      "Failed to load product details."
    );
  }
}


function showAddProductModal() {
  const modal =
    document.getElementById(
      "product-modal"
    );

  modal.innerHTML =
    createProductForm();

  modal.style.display = "flex";

  setTimeout(() => {
    toggleMaterialDropdown();
    updateRSNPreview();
  }, 100);
}


function closeProductModal() {
  const modal =
    document.getElementById(
      "product-modal"
    );

  modal.style.display = "none";
}


// =====================================================
// SAVE PRODUCT
// =====================================================

async function handleFormSubmit(editId) {
  const isEdit = !!editId;

  const url = isEdit
    ? `${API_URL}/products/${editId}`
    : `${API_URL}/products`;

  const method =
    isEdit ? "PUT" : "POST";

  const category =
    document.getElementById(
      "product-category"
    ).value;

  const gender =
    document.getElementById(
      "product-gender"
    ).value;

  const tarnishValue =
    document.getElementById(
      "product-tarnish"
    ).value;

  const type =
    tarnishValue === "y" ? 0 : 1;

  const material =
    type === 1
      ? parseInt(
          document.getElementById(
            "product-material"
          ).value
        )
      : 0;

  const rsn =
    document.getElementById(
      "rsn-preview"
    ).value;

  const description =
    document.getElementById(
      "product-description"
    ).value || "";

  const quantity =
    parseInt(
      document.getElementById(
        "product-quantity"
      ).value,
      10
    );

  let body;
  let headers;


  if (isEdit) {

    headers = getAdminHeaders();

    body = JSON.stringify({
      name:
        document.getElementById(
          "product-name"
        ).value,

      price:
        parseFloat(
          document.getElementById(
            "product-price"
          ).value
        ),

      quantity,
      category,

      isTrending:
        document.getElementById(
          "product-trending"
        ).checked
          ? "y"
          : "n",

      rsn,
      material,
      gender,
      type,
      description,
    });

  } else {

    headers =
      getAdminHeadersFormData();

    body = new FormData();

    body.append("id", Date.now());

    body.append(
      "name",
      document.getElementById(
        "product-name"
      ).value
    );

    body.append(
      "price",
      document.getElementById(
        "product-price"
      ).value
    );

    body.append(
      "quantity",
      quantity
    );

    body.append(
      "category",
      category
    );

    body.append(
      "isTrending",
      document.getElementById(
        "product-trending"
      ).checked
        ? "y"
        : "n"
    );

    body.append(
      "images",
      document.getElementById(
        "product-image"
      ).files[0]
    );

    body.append("rsn", rsn);
    body.append("material", material);
    body.append("gender", gender);
    body.append("type", type);

    body.append(
      "description",
      description
    );
  }


  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    if (!response.ok) {
      const error =
        await response.json();

      throw new Error(
        error.error ||
        `Failed to ${
          isEdit ? "update" : "add"
        } product`
      );
    }

    loadProductsIntoTable();

    closeProductModal();

    alert(
      `Product ${
        isEdit ? "updated" : "added"
      } successfully!`
    );

  } catch (error) {
    console.error("Error:", error);

    alert(
      `Failed to save product: ${error.message}`
    );
  }
}


// =====================================================
// DELETE PRODUCT
// =====================================================

async function deleteProduct(id) {
  if (
    !confirm(
      "Are you sure you want to permanently delete this product?"
    )
  ) {
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/products/${id}`,
      {
        method: "DELETE",
        headers: getAdminHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Failed to delete product"
      );
    }

    loadProductsIntoTable();

    alert(
      "Product deleted successfully."
    );

  } catch (error) {
    console.error(
      "Error deleting product:",
      error
    );

    alert(
      "Failed to delete product."
    );
  }
}
