// Local testing only.
// Production admin authentication will be replaced later.

const ADMIN_KEY = "admineveraura2025";

const API_URL = "https://everaura-backend.vercel.app/api";


document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadCouponsIntoTable();

  const couponForm =
    document.getElementById("coupon-form");

  if (couponForm) {
    couponForm.addEventListener(
      "submit",
      handleAddCoupon
    );
  }
});


// =====================================================
// ADMIN AUTH
// =====================================================

function getAdminHeaders() {
  return {
    "Content-Type": "application/json",
    "X-ADMIN-KEY": ADMIN_KEY,
  };
}


function checkAuth() {
  if (
    sessionStorage.getItem("isAdminLoggedIn") !== "true"
  ) {
    window.location.replace("admin.html");
  }
}


function logout() {
  sessionStorage.removeItem(
    "isAdminLoggedIn"
  );

  window.location.replace("admin.html");
}


// =====================================================
// LOAD COUPONS
// =====================================================

async function loadCouponsIntoTable() {
  const tbody =
    document.getElementById(
      "coupon-table-body"
    );


  if (!tbody) return;


  tbody.innerHTML = `
    <tr>
      <td colspan="6">
        Loading coupons...
      </td>
    </tr>
  `;


  try {

    const response = await fetch(
      `${API_URL}/coupons`,
      {
        headers: getAdminHeaders(),
      }
    );


    if (!response.ok) {

      throw new Error(
        `Failed to fetch coupons (${response.status})`
      );

    }


    const coupons =
      await response.json();


    tbody.innerHTML = "";


    if (
      !Array.isArray(coupons) ||
      coupons.length === 0
    ) {

      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            No coupons found.
          </td>
        </tr>
      `;

      return;

    }


    coupons.forEach((coupon) => {
      const usageText =
        coupon.max_uses_total === null ||
        coupon.max_uses_total === undefined
          ? `${coupon.used_count || 0} / Unlimited`
          : `${coupon.used_count || 0} / ${coupon.max_uses_total}`;
      const windowText =
        [coupon.start_at, coupon.end_at]
          .filter(Boolean)
          .map((value) => new Date(value).toLocaleString("en-IN"))
          .join(" → ") || "Always";

      tbody.innerHTML += `
        <tr>

          <td data-label="Code">
            <strong>
              ${coupon.code}
            </strong>
          </td>


          <td data-label="Discount">
            ${coupon.discount}%
          </td>

          <td data-label="Window">
            ${windowText}
          </td>

          <td data-label="Usage">
            ${usageText}
          </td>

          <td data-label="Active">
            ${coupon.active === false ? "No" : "Yes"}
          </td>


          <td
            data-label="Actions"
            class="action-buttons"
          >

            <button
              class="delete-btn"
              onclick="
                deleteCoupon(
                  '${coupon._id}'
                )
              "
              title="Delete Coupon"
            >
              <i class="fa-solid fa-trash"></i>
            </button>

          </td>

        </tr>
      `;

    });


  } catch (error) {

    console.error(
      "Failed to load coupons:",
      error
    );


    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          Error loading coupons: ${error.message}
        </td>
      </tr>
    `;

  }
}


// =====================================================
// CREATE COUPON
// =====================================================

async function handleAddCoupon(event) {

  event.preventDefault();


  const couponCode =
    document
      .getElementById("coupon-code")
      .value
      .trim()
      .toUpperCase();


  const discount =
    Number(
      document.getElementById(
        "coupon-discount"
      ).value
    );


  if (
    !couponCode ||
    discount < 1 ||
    discount > 100
  ) {

    alert(
      "Please enter a valid coupon code and discount."
    );

    return;

  }


  const data = {
    code: couponCode,
    discount: discount,
    start_at: document.getElementById("coupon-start-at").value
      ? new Date(document.getElementById("coupon-start-at").value).toISOString()
      : null,
    end_at: document.getElementById("coupon-end-at").value
      ? new Date(document.getElementById("coupon-end-at").value).toISOString()
      : null,
    max_uses_total: document.getElementById("coupon-max-uses").value
      ? Number(document.getElementById("coupon-max-uses").value)
      : null,
    active: document.getElementById("coupon-active").checked,
  };


  try {

    const response = await fetch(
      `${API_URL}/coupons`,
      {
        method: "POST",

        headers: getAdminHeaders(),

        body: JSON.stringify(data),
      }
    );


    if (!response.ok) {

      const error =
        await response.json();


      throw new Error(
        error.error ||
        "Failed to create coupon"
      );

    }


    document
      .getElementById("coupon-form")
      .reset();


    alert(
      "Coupon created successfully!"
    );


    loadCouponsIntoTable();


  } catch (error) {

    console.error(
      "Error creating coupon:",
      error
    );


    alert(
      `Failed to create coupon: ${error.message}`
    );

  }
}


// =====================================================
// DELETE COUPON
// =====================================================

async function deleteCoupon(id) {

  const confirmed = confirm(
    "Are you sure you want to delete this coupon?"
  );


  if (!confirmed) return;


  try {

    const response = await fetch(
      `${API_URL}/coupons/${id}`,
      {
        method: "DELETE",

        headers: getAdminHeaders(),
      }
    );


    if (!response.ok) {

      throw new Error(
        "Failed to delete coupon"
      );

    }


    alert(
      "Coupon deleted successfully!"
    );


    loadCouponsIntoTable();


  } catch (error) {

    console.error(
      "Error deleting coupon:",
      error
    );


    alert(
      "Failed to delete coupon."
    );

  }
}
