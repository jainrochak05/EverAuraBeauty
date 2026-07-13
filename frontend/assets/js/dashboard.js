// !IMPORTANT: Set this key to match your backend .env ADMIN_KEY
const ADMIN_KEY = "admineveraura2025";

const API_URL = "https://everaura-backend.vercel.app/api";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
    return;
  }

  checkAuth();
  loadDashboardOverview();
});

// --- ADMIN AUTH HEADERS ---
function getAdminHeaders() {
  return {
    "Content-Type": "application/json",
    "X-ADMIN-KEY": ADMIN_KEY,
  };
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

// === DASHBOARD OVERVIEW ===
async function loadDashboardOverview() {
  try {
    const [ordersResponse, productsResponse] = await Promise.all([
      fetch(`${API_URL}/admin/orders`, {
        headers: getAdminHeaders(),
      }),
      fetch(`${API_URL}/products`),
    ]);

    if (!ordersResponse.ok) {
      throw new Error("Failed to fetch orders");
    }

    if (!productsResponse.ok) {
      throw new Error("Failed to fetch products");
    }

    const orders = await ordersResponse.json();
    const products = await productsResponse.json();

    const paidOrders = orders.filter(
      (order) => order.payment_status === "Paid"
    );

    const totalSales = paidOrders.reduce((total, order) => {
      const itemsSold = (order.items || []).reduce(
        (itemTotal, item) => itemTotal + Number(item.quantity || 0),
        0
      );

      return total + itemsSold;
    }, 0);

    const totalRevenue = paidOrders.reduce(
      (total, order) => total + Number(order.total_amount || 0),
      0
    );

    const totalOrders = orders.length;
    const totalProducts = products.length;

    const lowStockProducts = products.filter((product) => {
      const quantity = Number(product.quantity || 0);
      return quantity > 0 && quantity <= 5;
    }).length;

    const outOfStockProducts = products.filter(
      (product) => Number(product.quantity || 0) <= 0
    ).length;

    setDashboardValue("total-sales", totalSales);
    setDashboardValue(
      "total-revenue",
      `₹${totalRevenue.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    );
    setDashboardValue("total-orders", totalOrders);
    setDashboardValue("total-products", totalProducts);
    setDashboardValue("low-stock-products", lowStockProducts);
    setDashboardValue("out-of-stock-products", outOfStockProducts);
  } catch (error) {
    console.error("Failed to load dashboard overview:", error);
    showDashboardError();
  }
}

function setDashboardValue(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function showDashboardError() {
  [
    "total-sales",
    "total-revenue",
    "total-orders",
    "total-products",
    "low-stock-products",
    "out-of-stock-products",
  ].forEach((id) => setDashboardValue(id, "Error"));
}
