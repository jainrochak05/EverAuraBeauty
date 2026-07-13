// !IMPORTANT:
// Local testing only.
// Production admin authentication will be replaced later.

const ADMIN_KEY = "admineveraura2025";

const API_URL = "https://everaura-backend.vercel.app/api";


document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadAdminOrders();
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
  sessionStorage.removeItem("isAdminLoggedIn");

  window.location.replace("admin.html");
}


// =====================================================
// LOAD ORDERS
// =====================================================

async function loadAdminOrders() {
  const tbody =
    document.getElementById("order-table-body");

  if (!tbody) return;


  tbody.innerHTML = `
    <tr>
      <td colspan="8">
        Loading orders...
      </td>
    </tr>
  `;


  try {

    const response = await fetch(
      `${API_URL}/admin/orders`,
      {
        headers: getAdminHeaders(),
      }
    );


    if (!response.ok) {
      throw new Error(
        `Failed to fetch orders (${response.status})`
      );
    }


    const orders = await response.json();


    tbody.innerHTML = "";


    if (
      !Array.isArray(orders) ||
      orders.length === 0
    ) {

      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            No orders found.
          </td>
        </tr>
      `;

      return;
    }


    orders.forEach((order) => {

      const itemsSummary =
        (order.items || [])
          .map(
            (item) =>
              `${item.name} (x${item.quantity})`
          )
          .join(", ");


      const address =
        order.shipping_address || {};


      const fullAddress = [
        address.name,
        address.phone,
        address.address,
        address.city,
        address.pincode,
      ]
        .filter(Boolean)
        .join(", ");


      const statusOptions = [
        "Pending",
        "Paid",
        "Packaging",
        "Shipped",
        "Delivered",
        "Cancelled",
      ]
        .map(
          (status) => `
            <option
              value="${status}"
              ${
                order.status === status
                  ? "selected"
                  : ""
              }
            >
              ${status}
            </option>
          `
        )
        .join("");


      const createdDate =
        order.created_at
          ? new Date(
              order.created_at
            ).toLocaleDateString("en-IN")
          : "N/A";


      tbody.innerHTML += `
        <tr>

          <td data-label="Order ID">
            ${order.order_id || "N/A"}
          </td>


          <td data-label="Date">
            ${createdDate}
          </td>


          <td
            data-label="Customer"
            title="${fullAddress}"
          >
            ${address.name || "N/A"}
          </td>


          <td
            data-label="Items"
            title="${itemsSummary}"
          >
            ${
              itemsSummary.length > 40
                ? itemsSummary.substring(0, 40) + "..."
                : itemsSummary
            }
          </td>


          <td data-label="Total">
            ₹${Number(
              order.total_amount || 0
            ).toFixed(2)}
          </td>


          <td data-label="Payment">
            ${order.payment_status || "N/A"}
          </td>


          <td data-label="Status">

            <select
              class="admin-select"
              onchange="
                handleUpdateStatus(
                  '${order.order_id}',
                  this.value
                )
              "
            >
              ${statusOptions}
            </select>

          </td>


          <td data-label="Tracking">

            <input
              type="text"
              class="admin-input"
              id="tracking-${order.order_id}"
              value="${order.tracking_link || ""}"
              placeholder="Enter tracking link"
            >

            <button
              class="admin-button-small"
              onclick="
                handleAddTracking(
                  '${order.order_id}'
                )
              "
            >
              Save
            </button>

          </td>

        </tr>
      `;

    });


  } catch (error) {

    console.error(
      "Failed to load orders:",
      error
    );


    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          Error loading orders: ${error.message}
        </td>
      </tr>
    `;

  }
}


// =====================================================
// UPDATE ORDER STATUS
// =====================================================

async function handleUpdateStatus(
  orderId,
  status
) {

  const confirmed = confirm(
    `Are you sure you want to update order ${orderId} to "${status}"?`
  );


  if (!confirmed) {

    loadAdminOrders();

    return;
  }


  try {

    const response = await fetch(
      `${API_URL}/admin/orders/${orderId}/update-status`,
      {
        method: "PUT",

        headers: getAdminHeaders(),

        body: JSON.stringify({
          status: status,
        }),
      }
    );


    if (!response.ok) {

      throw new Error(
        "Failed to update status"
      );

    }


    alert(
      "Status updated! The user will be notified."
    );


    loadAdminOrders();


  } catch (error) {

    console.error(
      "Error updating status:",
      error
    );


    alert(
      "Failed to update status."
    );


    loadAdminOrders();

  }
}


// =====================================================
// ADD TRACKING LINK
// =====================================================

async function handleAddTracking(orderId) {

  const trackingInput =
    document.getElementById(
      `tracking-${orderId}`
    );


  const trackingLink =
    trackingInput.value.trim();


  if (!trackingLink) {

    alert(
      "Please enter a tracking link first."
    );

    return;

  }


  try {

    const response = await fetch(
      `${API_URL}/admin/orders/${orderId}/add-tracking`,
      {
        method: "PUT",

        headers: getAdminHeaders(),

        body: JSON.stringify({
          tracking_link: trackingLink,
        }),
      }
    );


    if (!response.ok) {

      throw new Error(
        "Failed to add tracking"
      );

    }


    alert(
      "Tracking link saved! If the order is 'Shipped', the user will be notified."
    );


    loadAdminOrders();


  } catch (error) {

    console.error(
      "Error saving tracking link:",
      error
    );


    alert(
      "Failed to save tracking link."
    );

  }
}
