// Local testing only.
// Production admin authentication will be replaced later.

const ADMIN_KEY = "admineveraura2025";

const API_URL = "https://everaura-backend.vercel.app/api";


document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadAllTestimonials();
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
// LOAD TESTIMONIALS
// =====================================================

async function loadAllTestimonials() {
  const tableBody =
    document.getElementById(
      "all-testimonials-body"
    );


  if (!tableBody) return;


  tableBody.innerHTML = `
    <tr>
      <td colspan="5">
        Loading testimonials...
      </td>
    </tr>
  `;


  try {

    const response = await fetch(
      `${API_URL}/testimonials`,
      {
        headers: getAdminHeaders(),
      }
    );


    if (!response.ok) {

      throw new Error(
        `Failed to fetch testimonials (${response.status})`
      );

    }


    let testimonials =
      await response.json();


    tableBody.innerHTML = "";


    if (
      !Array.isArray(testimonials) ||
      testimonials.length === 0
    ) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="5">
            No testimonials found.
          </td>
        </tr>
      `;

      return;

    }


    // Pending testimonials first

    testimonials.sort((a, b) => {

      if (
        a.status === "pending" &&
        b.status !== "pending"
      ) {
        return -1;
      }


      if (
        b.status === "pending" &&
        a.status !== "pending"
      ) {
        return 1;
      }


      return 0;

    });


    testimonials.forEach((testimonial) => {

      const statusBadge =
        testimonial.status === "approved"

          ? `
            <span style="color: var(--admin-green);">
              ✓ Approved
            </span>
          `

          : `
            <span style="color: #f39c12;">
              ⏳ Pending
            </span>
          `;


      let actionButtons = "";


      if (
        testimonial.status === "pending"
      ) {

        actionButtons += `
          <button
            class="approve-btn"
            onclick="
              approveTestimonial(
                '${testimonial._id}'
              )
            "
            title="Approve"
          >
            <i class="fa-solid fa-check"></i>
          </button>
        `;

      }


      actionButtons += `
        <button
          class="delete-btn"
          onclick="
            deleteTestimonial(
              '${testimonial._id}'
            )
          "
          title="Delete"
        >
          <i class="fa-solid fa-trash"></i>
        </button>
      `;


      tableBody.innerHTML += `
        <tr>

          <td data-label="Name">
            ${testimonial.name || "N/A"}
          </td>


          <td data-label="Summary">
            ${testimonial.summary || "N/A"}
          </td>


          <td data-label="Full Review">
            ${testimonial.full_review || "N/A"}
          </td>


          <td data-label="Status">
            ${statusBadge}
          </td>


          <td
            data-label="Actions"
            class="action-buttons"
          >
            ${actionButtons}
          </td>

        </tr>
      `;

    });


  } catch (error) {

    console.error(
      "Failed to load testimonials:",
      error
    );


    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          Error loading testimonials: ${error.message}
        </td>
      </tr>
    `;

  }
}


// =====================================================
// APPROVE TESTIMONIAL
// =====================================================

async function approveTestimonial(
  testimonialId
) {

  const confirmed = confirm(
    "Approve this testimonial to make it public?"
  );


  if (!confirmed) return;


  try {

    const response = await fetch(
      `${API_URL}/testimonials/${testimonialId}/approve`,
      {
        method: "PUT",

        headers: getAdminHeaders(),
      }
    );


    if (!response.ok) {

      throw new Error(
        "Failed to approve testimonial"
      );

    }


    alert(
      "Testimonial approved!"
    );


    loadAllTestimonials();


  } catch (error) {

    console.error(
      "Error approving testimonial:",
      error
    );


    alert(
      "Approval failed. Please try again."
    );

  }
}


// =====================================================
// DELETE TESTIMONIAL
// =====================================================

async function deleteTestimonial(
  testimonialId
) {

  const confirmed = confirm(
    "Are you sure you want to permanently delete this testimonial?"
  );


  if (!confirmed) return;


  try {

    const response = await fetch(
      `${API_URL}/testimonials/${testimonialId}`,
      {
        method: "DELETE",

        headers: getAdminHeaders(),
      }
    );


    if (!response.ok) {

      throw new Error(
        "Failed to delete testimonial"
      );

    }


    alert(
      "Testimonial deleted."
    );


    loadAllTestimonials();


  } catch (error) {

    console.error(
      "Error deleting testimonial:",
      error
    );


    alert(
      "Deletion failed. Please try again."
    );

  }
}
