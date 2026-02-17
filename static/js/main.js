"use strict";

const STORAGE_KEY = "fuel-check-auth-v1";
const API_BASE = "/api";
const USER_BASE = "/user";

const state = {
  auth: {
    access: null,
    refresh: null,
  },
  vehicles: [],
  filteredVehicles: [],
  vehicleSearchTerm: "",
  currentVehicle: null,
  transactions: [],
  filteredTransactions: [],
  txnFilter: "all",
  txnSearchTerm: "",
  pagination: {
    page: 1,
    perPage: 6,
    totalPages: 1,
  },
};

const dom = {
  loader: document.getElementById("globalLoader"),
  toastContainer: document.getElementById("toastContainer"),
};

// -----------------------------------------------------------------------------
// Auth helpers
// -----------------------------------------------------------------------------
function hydrateAuth() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      state.auth.access = parsed.access || null;
      state.auth.refresh = parsed.refresh || null;
    }
  } catch (error) {
    console.warn("Failed to parse auth storage", error);
    localStorage.removeItem(STORAGE_KEY);
  }
}

function persistAuth() {
  if (state.auth.access && state.auth.refresh) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ access: state.auth.access, refresh: state.auth.refresh })
    );
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function setAuthTokens(access, refresh) {
  state.auth.access = access;
  state.auth.refresh = refresh || state.auth.refresh;
  persistAuth();
  syncAuthVisibility();
}

function clearAuthTokens() {
  state.auth.access = null;
  state.auth.refresh = null;
  persistAuth();
  syncAuthVisibility();
}

function hasValidSession() {
  return Boolean(state.auth.access);
}

// -----------------------------------------------------------------------------
// UI helpers
// -----------------------------------------------------------------------------
function syncAuthVisibility() {
  const wantsAuth = document.querySelectorAll('[data-auth="true"]');
  const wantsGuest = document.querySelectorAll('[data-auth="false"]');
  wantsAuth.forEach((el) => {
    if (hasValidSession()) {
      el.classList.remove("d-none");
    } else {
      el.classList.add("d-none");
    }
  });
  wantsGuest.forEach((el) => {
    if (hasValidSession()) {
      el.classList.add("d-none");
    } else {
      el.classList.remove("d-none");
    }
  });
}

function toggleGlobalLoader(isVisible) {
  if (!dom.loader) return;
  if (isVisible) {
    dom.loader.classList.remove("d-none");
  } else {
    dom.loader.classList.add("d-none");
  }
}

function createToast({ title, message, variant = "primary", delay = 4500 }) {
  if (!dom.toastContainer) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="toast text-bg-${variant} border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${delay}">
      <div class="toast-header text-bg-${variant}">
        <strong class="me-auto">${title}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">${message}</div>
    </div>
  `;
  const toastEl = wrapper.firstElementChild;
  dom.toastContainer.appendChild(toastEl);
  const instance = bootstrap.Toast.getOrCreateInstance(toastEl);
  instance.show();
  toastEl.addEventListener("hidden.bs.toast", () => {
    toastEl.remove();
  });
}

function applyPasswordToggles() {
  document.querySelectorAll('[data-toggle="password"]').forEach((btn) => {
    if (btn.dataset.toggleInitialized) return;
    btn.dataset.toggleInitialized = "true";
    btn.addEventListener("click", () => {
      const targetSelector = btn.dataset.target;
      if (!targetSelector) return;
      const input = document.querySelector(targetSelector);
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.innerHTML = `<span class="bi ${isPassword ? "bi-eye-slash" : "bi-eye"}"></span>`;
    });
  });
}

function setFormState(form, isSubmitting) {
  if (!form) return;
  const submit = form.querySelector('[type="submit"]');
  if (submit) {
    submit.disabled = isSubmitting;
    submit.classList.toggle("disabled", isSubmitting);
  }
}

function displayFormError(target, errors) {
  if (!target) return;
  target.classList.remove("d-none", "alert-success", "alert-warning");
  target.classList.add("alert", "alert-danger");
  if (!errors) {
    target.textContent = "Something went wrong. Please try again.";
    return;
  }
  if (typeof errors === "string") {
    target.textContent = errors;
    return;
  }
  if (Array.isArray(errors)) {
    target.innerHTML = errors.map((msg) => `<div>${msg}</div>`).join("");
    return;
  }
  const items = Object.entries(errors).map(([field, messages]) => {
    const label = field === "non_field_errors" ? "" : `${field}: `;
    const desc = Array.isArray(messages) ? messages.join(" ") : messages;
    return `<div>${label}${desc}</div>`;
  });
  target.innerHTML = items.join("");
}

function displayFormSuccess(target, message) {
  if (!target) return;
  target.classList.remove("d-none", "alert-danger", "alert-warning");
  target.classList.add("alert", "alert-success");
  target.textContent = message;
}

function clearAlerts(...elements) {
  elements.forEach((el) => {
    if (!el) return;
    el.classList.add("d-none");
    el.classList.remove("alert", "alert-danger", "alert-success", "alert-warning");
    el.textContent = "";
  });
}

function formatNumber(value, { fallback = "—", decimals = 0 } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value, { fallback = "—" } = {}) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function paginate(array, page, perPage) {
  const total = array.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  return {
    slice: array.slice(start, end),
    total,
    totalPages,
    currentPage,
  };
}

function enforceAuth() {
  if (!hasValidSession()) {
    window.location.replace("/login");
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// API client
// -----------------------------------------------------------------------------
async function apiFetch(path, options = {}, { skipAuth = false } = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (!skipAuth && hasValidSession()) {
    headers.set("Authorization", `Bearer ${state.auth.access}`);
  }
  const response = await fetch(path, { ...options, headers });
  if (response.status === 401 && !skipAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiFetch(path, options, { skipAuth: true });
    }
    clearAuthTokens();
    window.location.replace("/login");
    return Promise.reject(new Error("Session expired. Please sign in again."));
  }
  return response;
}

async function tryRefreshToken() {
  if (!state.auth.refresh) return false;
  try {
    const res = await fetch(`${USER_BASE}/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: state.auth.refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.access) {
      setAuthTokens(data.access, data.refresh || state.auth.refresh);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Refresh token failed", error);
    return false;
  }
}

async function requestJSON(path, options = {}) {
  const response = await apiFetch(path, options);
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(payload?.detail || payload?.message || "Request failed");
    error.payload = payload;
    error.status = response.status;
    throw error;
  }
  return payload;
}

// -----------------------------------------------------------------------------
// Renderers
// -----------------------------------------------------------------------------
async function renderLogin() {
  if (hasValidSession()) {
    window.location.replace("/dashboard");
    return;
  }
  const form = document.getElementById("loginForm");
  if (!form) return;
  const errorAlert = document.getElementById("loginError");
  const successAlert = document.getElementById("loginSuccess");
  clearAlerts(errorAlert, successAlert);
  applyPasswordToggles();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlerts(errorAlert, successAlert);
    form.classList.add("was-validated");
    if (!form.checkValidity()) {
      return;
    }
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    setFormState(form, true);
    try {
      const data = await requestJSON(`${USER_BASE}/login/`, {
        method: "POST",
        body: JSON.stringify({
          username: payload.email,
          email: payload.email,
          password: payload.password,
        }),
      });
      setAuthTokens(data.access, data.refresh);
      displayFormSuccess(successAlert, "Success! Redirecting to your dashboard...");
      createToast({ title: "Welcome", message: "You are signed in.", variant: "success" });
      setTimeout(() => {
        window.location.replace("/dashboard");
      }, 650);
    } catch (error) {
      const message = error.payload?.detail || "Invalid email or password.";
      displayFormError(errorAlert, message);
    } finally {
      setFormState(form, false);
    }
  });
}

async function renderRegister() {
  if (hasValidSession()) {
    window.location.replace("/dashboard");
    return;
  }
  const form = document.getElementById("registerForm");
  if (!form) return;
  const errorAlert = document.getElementById("registerError");
  const successAlert = document.getElementById("registerSuccess");
  clearAlerts(errorAlert, successAlert);
  applyPasswordToggles();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlerts(errorAlert, successAlert);
    form.classList.add("was-validated");
    if (!form.checkValidity()) {
      return;
    }
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    setFormState(form, true);
    try {
      await requestJSON(`${USER_BASE}/register/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      displayFormSuccess(successAlert, "Account created. You can sign in now.");
      createToast({
        title: "Account ready",
        message: "Registration successful. Redirecting to login...",
        variant: "success",
      });
      setTimeout(() => {
        window.location.replace("/login");
      }, 1000);
    } catch (error) {
      const payloadErrors = error.payload;
      if (payloadErrors) {
        displayFormError(errorAlert, payloadErrors);
      } else {
        displayFormError(errorAlert, "Registration failed. Please try again.");
      }
    } finally {
      setFormState(form, false);
    }
  });
}

async function renderDashboard() {
  if (!enforceAuth()) return;
  toggleGlobalLoader(true);
  try {
    await loadVehicles();
    bindVehicleSearch();
    bindVehicleForm();
    renderVehicleList();
    renderVehicleSummary();
  } catch (error) {
    console.error("Failed to render dashboard", error);
    createToast({
      title: "Error",
      message: error.message || "Could not load vehicles.",
      variant: "danger",
    });
  } finally {
    toggleGlobalLoader(false);
  }
}

async function renderVehicleDetail(vehicleId) {
  if (!enforceAuth()) return;
  const id = Number(vehicleId);
  if (!Number.isFinite(id)) {
    window.location.replace("/dashboard");
    return;
  }
  toggleGlobalLoader(true);
  try {
    await loadVehicleDetail(id);
    await loadTransactions(id);
    bindTransactionControls();
    renderVehicleDetailCard();
    renderTransactionList();
  } catch (error) {
    console.error("Failed to load vehicle detail", error);
    createToast({
      title: "Error",
      message: error.message || "Could not load vehicle detail.",
      variant: "danger",
    });
  } finally {
    toggleGlobalLoader(false);
  }
}

// -----------------------------------------------------------------------------
// Vehicles
// -----------------------------------------------------------------------------
async function loadVehicles() {
  const data = await requestJSON(`${API_BASE}/vehicles/`);
  state.vehicles = Array.isArray(data) ? data : data?.results || [];
  state.filteredVehicles = [...state.vehicles];
  state.vehicleSearchTerm = "";
}

function bindVehicleSearch() {
  const search = document.getElementById("vehicleSearch");
  if (!search) return;
  search.value = state.vehicleSearchTerm;
  search.addEventListener("input", (event) => {
    state.vehicleSearchTerm = event.target.value.trim().toLowerCase();
    filterVehicles();
    renderVehicleList();
    renderVehicleSummary();
  });
}

function filterVehicles() {
  if (!state.vehicleSearchTerm) {
    state.filteredVehicles = [...state.vehicles];
    return;
  }
  const term = state.vehicleSearchTerm;
  state.filteredVehicles = state.vehicles.filter((vehicle) => {
    const haystack = [
      vehicle.regno,
      vehicle.name,
      vehicle.model,
      vehicle.company,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
}

function renderVehicleSummary() {
  const stats = {
    count: document.querySelector('[data-stat="vehicle-count"]'),
    totalKms: document.querySelector('[data-stat="total-kms"]'),
    avgMileage: document.querySelector('[data-stat="avg-mileage"]'),
    lastService: document.querySelector('[data-stat="last-service"]'),
  };
  const vehicles = state.vehicles;
  stats.count && (stats.count.textContent = vehicles.length.toString());
  if (stats.totalKms) {
    const sum = vehicles.reduce((acc, v) => acc + (Number(v.total_kms_driven) || 0), 0);
    stats.totalKms.textContent = formatNumber(sum, { decimals: 0, fallback: "0" });
  }
  if (stats.avgMileage) {
    if (!vehicles.length) {
      stats.avgMileage.textContent = "0";
    } else {
      const avg =
        vehicles.reduce((acc, v) => acc + (Number(v.average_mileage) || 0), 0) /
        vehicles.length;
      stats.avgMileage.textContent = `${formatNumber(avg, { decimals: 1, fallback: "0" })} km/l`;
    }
  }
  if (stats.lastService) {
    const latest = vehicles
      .map((v) => v.last_service_date)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0];
    stats.lastService.textContent = latest ? formatDate(latest) : "—";
  }
}

function renderVehicleList() {
  const list = document.getElementById("vehiclesList");
  const empty = document.getElementById("vehiclesEmpty");
  if (!list) return;
  list.innerHTML = "";
  const template = document.getElementById("vehicleCardTemplate");
  if (!template) return;
  if (!state.filteredVehicles.length) {
    empty && empty.classList.remove("d-none");
    return;
  }
  empty && empty.classList.add("d-none");
  state.filteredVehicles.forEach((vehicle) => {
    const clone = template.content.firstElementChild.cloneNode(true);
    populateVehicleCard(clone, vehicle);
    list.appendChild(clone);
  });
}

function populateVehicleCard(card, vehicle) {
  card.querySelector('[data-field="fuel-type"]').textContent = vehicle.fuel_type || "—";
  card.querySelector('[data-field="name"]').textContent = vehicle.name || "Unnamed";
  card.querySelector('[data-field="regno"]').textContent = vehicle.regno || "";
  card.querySelector('[data-field="model"]').textContent = vehicle.model || "—";
  card.querySelector('[data-field="company"]').textContent = vehicle.company || "—";
  card.querySelector('[data-field="current-mileage"]').textContent =
    vehicle.current_mileage ? `${formatNumber(vehicle.current_mileage, { decimals: 1 })} km/l` : "—";
  card.querySelector('[data-field="last-service"]').textContent = formatDate(vehicle.last_service_date);

  card.querySelectorAll('[data-action="view"]').forEach((action) => {
    action.addEventListener("click", () => {
      window.location.href = `/vehicle/${vehicle.id}/`;
    });
  });
  card.querySelectorAll('[data-action="edit"]').forEach((action) => {
    action.addEventListener("click", () => openVehicleModal(vehicle));
  });
  card.querySelectorAll('[data-action="delete"]').forEach((action) => {
    action.addEventListener("click", () => confirmVehicleDelete(vehicle));
  });
}

function openVehicleModal(vehicle = null) {
  const modalEl = document.getElementById("vehicleModal");
  const form = document.getElementById("vehicleForm");
  const alertBox = document.getElementById("vehicleFormAlert");
  if (!modalEl || !form) return;
  clearAlerts(alertBox);
  form.reset();
  form.classList.remove("was-validated");
  form.dataset.mode = vehicle ? "edit" : "create";
  document.getElementById("vehicleModalLabel").textContent = vehicle ? "Edit vehicle" : "Add vehicle";
  const submitBtn = document.getElementById("vehicleFormSubmit");
  if (submitBtn) {
    submitBtn.textContent = vehicle ? "Update vehicle" : "Save vehicle";
  }
  if (vehicle) {
    form.querySelector("#vehicleId").value = vehicle.id;
    form.querySelector("#regno").value = vehicle.regno || "";
    form.querySelector("#name").value = vehicle.name || "";
    form.querySelector("#model").value = vehicle.model || "";
    form.querySelector("#company").value = vehicle.company || "";
    form.querySelector("#color").value = vehicle.color || "";
    form.querySelector("#fuel_type").value = vehicle.fuel_type || "";
    form.querySelector("#current_mileage").value = vehicle.current_mileage ?? "";
    form.querySelector("#average_mileage").value = vehicle.average_mileage ?? "";
    form.querySelector("#total_kms_driven").value = vehicle.total_kms_driven ?? "";
    form.querySelector("#fuel_tank_capacity").value = vehicle.fuel_tank_capacity ?? "";
    form.querySelector("#last_service_date").value = vehicle.last_service_date || "";
    form.querySelector("#chasis_no").value = vehicle.chasis_no || "";
  }
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

function bindVehicleForm() {
  const form = document.getElementById("vehicleForm");
  if (!form) return;
  const alertBox = document.getElementById("vehicleFormAlert");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlerts(alertBox);
    form.classList.add("was-validated");
    if (!form.checkValidity()) {
      return;
    }
    const data = new FormData(form);
    const isEdit = form.dataset.mode === "edit";
    const vehicleId = data.get("vehicleId") || data.get("id") || form.querySelector("#vehicleId")?.value;
    const payload = {
      regno: data.get("regno"),
      name: data.get("name"),
      model: data.get("model") || null,
      color: data.get("color") || null,
      company: data.get("company") || null,
      current_mileage: data.get("current_mileage") ? Number(data.get("current_mileage")) : null,
      average_mileage: data.get("average_mileage") ? Number(data.get("average_mileage")) : null,
      total_kms_driven: data.get("total_kms_driven") ? Number(data.get("total_kms_driven")) : null,
      fuel_type: data.get("fuel_type") || null,
      last_service_date: data.get("last_service_date") || null,
      chasis_no: data.get("chasis_no") || null,
      fuel_tank_capacity: data.get("fuel_tank_capacity") ? Number(data.get("fuel_tank_capacity")) : null,
    };
    setFormState(form, true);
    try {
      const method = isEdit ? "PUT" : "POST";
      const endpoint = isEdit
        ? `${API_BASE}/vehicles/${vehicleId}/`
        : `${API_BASE}/vehicles/`;
      await requestJSON(endpoint, {
        method,
        body: JSON.stringify(payload),
      });
      await loadVehicles();
      filterVehicles();
      renderVehicleList();
      renderVehicleSummary();
      createToast({
        title: "Success",
        message: isEdit ? "Vehicle updated." : "Vehicle added.",
        variant: "success",
      });
      const modalEl = document.getElementById("vehicleModal");
      if (modalEl) {
        bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      }
    } catch (error) {
      const details = error.payload || error.message;
      displayFormError(alertBox, details);
    } finally {
      setFormState(form, false);
    }
  });
}

function confirmVehicleDelete(vehicle) {
  if (!window.confirm(`Delete ${vehicle.name || vehicle.regno || "this vehicle"}?`)) {
    return;
  }
  toggleGlobalLoader(true);
  requestJSON(`${API_BASE}/vehicles/${vehicle.id}/`, { method: "DELETE" })
    .then(async () => {
      createToast({ title: "Deleted", message: "Vehicle removed.", variant: "warning" });
      await loadVehicles();
      filterVehicles();
      renderVehicleList();
      renderVehicleSummary();
    })
    .catch((error) => {
      const message = error.payload?.detail || error.message || "Failed to delete vehicle.";
      createToast({ title: "Error", message, variant: "danger" });
    })
    .finally(() => toggleGlobalLoader(false));
}

// -----------------------------------------------------------------------------
// Vehicle detail and transactions
// -----------------------------------------------------------------------------
async function loadVehicleDetail(id) {
  state.currentVehicle = await requestJSON(`${API_BASE}/vehicles/${id}/`);
}

async function loadTransactions(vehicleId) {
  const data = await requestJSON(`${API_BASE}/txns/?vehicle=${vehicleId}&ordering=-created_at`);
  state.transactions = Array.isArray(data) ? data : data?.results || [];
  state.filteredTransactions = [...state.transactions];
  state.pagination.page = 1;
  state.pagination.totalPages = Math.max(1, Math.ceil(state.filteredTransactions.length / state.pagination.perPage));
}

function bindTransactionControls() {
  const search = document.getElementById("txnSearch");
  const filter = document.getElementById("txnFilter");
  const form = document.getElementById("txnForm");
  const alertBox = document.getElementById("txnFormAlert");
  const pagination = document.getElementById("txnPagination");

  if (search) {
    search.value = state.txnSearchTerm;
    search.addEventListener("input", (event) => {
      state.txnSearchTerm = event.target.value.toLowerCase();
      filterTransactions();
      renderTransactionList();
    });
  }

  if (filter) {
    filter.value = state.txnFilter;
    filter.addEventListener("change", (event) => {
      state.txnFilter = event.target.value;
      filterTransactions();
      renderTransactionList();
    });
  }

  if (pagination) {
    pagination.addEventListener("click", (event) => {
      const target = event.target.closest("button[data-page]");
      if (!target) return;
      state.pagination.page = Number(target.dataset.page);
      renderTransactionList();
    });
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearAlerts(alertBox);
      form.classList.add("was-validated");
      if (!form.checkValidity()) {
        return;
      }
      const data = new FormData(form);
      const isEdit = Boolean(data.get("txnId"));
      const payload = {
        vehicle: state.currentVehicle?.id,
        amount: data.get("amount") ? Number(data.get("amount")) : null,
        fuel_qty: data.get("fuel_qty") ? Number(data.get("fuel_qty")) : null,
        tank_fully_filled: data.get("tank_fully_filled") === "true",
        location: data.get("location") || null,
      };
      setFormState(form, true);
      try {
        const method = isEdit ? "PUT" : "POST";
        const endpoint = isEdit
          ? `${API_BASE}/txns/${data.get("txnId")}/`
          : `${API_BASE}/txns/`;
        await requestJSON(endpoint, {
          method,
          body: JSON.stringify(payload),
        });
        await loadTransactions(state.currentVehicle.id);
        filterTransactions();
        renderTransactionList();
        createToast({
          title: "Saved",
          message: isEdit ? "Transaction updated." : "Transaction added.",
          variant: "success",
        });
        const modalEl = document.getElementById("txnModal");
        if (modalEl) {
          bootstrap.Modal.getOrCreateInstance(modalEl).hide();
        }
      } catch (error) {
        const details = error.payload || error.message;
        displayFormError(alertBox, details);
      } finally {
        setFormState(form, false);
      }
    });
  }
}

function renderVehicleDetailCard() {
  const container = document.getElementById("vehicleInfo");
  const title = document.getElementById("vehicleTitle");
  if (!container || !state.currentVehicle) return;
  const vehicle = state.currentVehicle;
  title && (title.textContent = vehicle.name || vehicle.regno || "Vehicle details");
  container.querySelector('[data-field="fuel-type"]').textContent = vehicle.fuel_type || "—";
  container.querySelector('[data-field="name"]').textContent = vehicle.name || "—";
  container.querySelector('[data-field="regno"]').textContent = vehicle.regno || "—";
  container.querySelector('[data-field="updated-at"]').textContent = formatDate(vehicle.updated_at);
  container.querySelector('[data-field="model"]').textContent = vehicle.model || "—";
  container.querySelector('[data-field="company"]').textContent = vehicle.company || "—";
  container.querySelector('[data-field="color"]').textContent = vehicle.color || "—";
  container.querySelector('[data-field="chasis-no"]').textContent = vehicle.chasis_no || "—";
  container.querySelector('[data-field="current-mileage"]').textContent = vehicle.current_mileage
    ? formatNumber(vehicle.current_mileage, { decimals: 1 })
    : "—";
  container.querySelector('[data-field="average-mileage"]').textContent = vehicle.average_mileage
    ? formatNumber(vehicle.average_mileage, { decimals: 1 })
    : "—";
  container.querySelector('[data-field="total-kms"]').textContent = formatNumber(vehicle.total_kms_driven, {
    decimals: 0,
    fallback: "—",
  });
  container.querySelector('[data-field="last-service"]').textContent = formatDate(vehicle.last_service_date);
}

function filterTransactions() {
  const term = state.txnSearchTerm;
  const mode = state.txnFilter;
  state.filteredTransactions = state.transactions.filter((txn) => {
    if (mode === "filled" && !txn.tank_fully_filled) return false;
    if (mode === "partial" && txn.tank_fully_filled) return false;
    if (!term) return true;
    const haystack = [txn.amount, txn.fuel_qty, txn.location]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
  state.pagination.page = 1;
  state.pagination.totalPages = Math.max(
    1,
    Math.ceil(state.filteredTransactions.length / state.pagination.perPage)
  );
}

function renderTransactionList() {
  const list = document.getElementById("txnsList");
  const empty = document.getElementById("txnsEmpty");
  const pagination = document.getElementById("txnPagination");
  if (!list) return;
  list.innerHTML = "";
  const template = document.getElementById("txnCardTemplate");
  if (!template) return;

  if (!state.filteredTransactions.length) {
    empty && empty.classList.remove("d-none");
    pagination && (pagination.innerHTML = "");
    return;
  }
  empty && empty.classList.add("d-none");

  const { slice, totalPages, currentPage } = paginate(
    state.filteredTransactions,
    state.pagination.page,
    state.pagination.perPage
  );
  slice.forEach((txn) => {
    const clone = template.content.firstElementChild.cloneNode(true);
    populateTxnCard(clone, txn);
    list.appendChild(clone);
  });
  renderPaginationControls(pagination, totalPages, currentPage);
}

function populateTxnCard(card, txn) {
  card.querySelector('[data-field="amount"]').textContent = formatCurrency(txn.amount);
  card.querySelector('[data-field="date"]').textContent = formatDate(txn.created_at);
  card.querySelector('[data-field="fuel_qty"]').textContent = `${formatNumber(txn.fuel_qty, {
    decimals: 2,
    fallback: "—",
  })} L`;
  card.querySelector('[data-field="location"]').textContent = txn.location || "—";
  const tankBadge = card.querySelector('[data-field="tank"]');
  tankBadge.textContent = txn.tank_fully_filled ? "Full tank" : "Partial";
  tankBadge.classList.toggle("text-bg-success", Boolean(txn.tank_fully_filled));
  tankBadge.classList.toggle("text-bg-warning", !txn.tank_fully_filled);

  card.querySelectorAll('[data-action="edit"]').forEach((action) => {
    action.addEventListener("click", () => openTxnModal(txn));
  });
  card.querySelectorAll('[data-action="delete"]').forEach((action) => {
    action.addEventListener("click", () => confirmTxnDelete(txn));
  });
}

function renderPaginationControls(container, totalPages, currentPage) {
  if (!container) return;
  container.innerHTML = "";
  if (totalPages <= 1) return;
  for (let page = 1; page <= totalPages; page += 1) {
    const li = document.createElement("li");
    li.className = `page-item ${page === currentPage ? "active" : ""}`;
    li.innerHTML = `<button class="page-link" data-page="${page}" type="button">${page}</button>`;
    container.appendChild(li);
  }
}

function openTxnModal(txn = null) {
  const modalEl = document.getElementById("txnModal");
  const form = document.getElementById("txnForm");
  const alertBox = document.getElementById("txnFormAlert");
  if (!modalEl || !form) return;
  clearAlerts(alertBox);
  form.reset();
  form.classList.remove("was-validated");
  form.querySelector("#txnId").value = txn?.id || "";
  document.getElementById("txnModalLabel").textContent = txn ? "Edit transaction" : "Add transaction";
  const submitBtn = document.getElementById("txnFormSubmit");
  if (submitBtn) submitBtn.textContent = txn ? "Update transaction" : "Save transaction";
  if (txn) {
    form.querySelector("#amount").value = txn.amount ?? "";
    form.querySelector("#fuel_qty").value = txn.fuel_qty ?? "";
    form.querySelector("#tank_fully_filled").value = txn.tank_fully_filled ? "true" : "false";
    form.querySelector("#location").value = txn.location || "";
  }
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

function confirmTxnDelete(txn) {
  if (!window.confirm("Delete this transaction?")) return;
  toggleGlobalLoader(true);
  requestJSON(`${API_BASE}/txns/${txn.id}/`, { method: "DELETE" })
    .then(async () => {
      createToast({ title: "Deleted", message: "Transaction removed.", variant: "warning" });
      await loadTransactions(state.currentVehicle.id);
      filterTransactions();
      renderTransactionList();
    })
    .catch((error) => {
      const message = error.payload?.detail || error.message || "Failed to delete transaction.";
      createToast({ title: "Error", message, variant: "danger" });
    })
    .finally(() => toggleGlobalLoader(false));
}

// -----------------------------------------------------------------------------
// Routing
// -----------------------------------------------------------------------------
function route() {
  const rawPath = window.location.pathname;
  const path = rawPath.endsWith("/") && rawPath.length > 1 ? rawPath.slice(0, -1) : rawPath;
  syncAuthVisibility();
  switch (path) {
    case "/":
      if (hasValidSession()) {
        window.location.replace("/dashboard");
      } else {
        window.location.replace("/login");
      }
      break;
    case "/login":
      renderLogin();
      break;
    case "/register":
      renderRegister();
      break;
    case "/dashboard":
      renderDashboard();
      break;
    default:
      if (path.startsWith("/vehicle/")) {
        const idSegment = path.split("/").pop();
        renderVehicleDetail(idSegment);
      }
      break;
  }
}

// -----------------------------------------------------------------------------
// Global bindings
// -----------------------------------------------------------------------------
function init() {
  hydrateAuth();
  syncAuthVisibility();
  applyPasswordToggles();
  attachLogoutHandler();
  route();
}

function attachLogoutHandler() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;
  logoutBtn.addEventListener("click", () => {
    clearAuthTokens();
    createToast({ title: "Signed out", message: "You have been logged out.", variant: "info" });
    window.location.replace("/login");
  });
}

window.addEventListener("popstate", route);
document.addEventListener("DOMContentLoaded", init);
