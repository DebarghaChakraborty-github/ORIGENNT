const API = {
  login: "/api/auth/login",
  session: "/api/auth/session"
};

const state = {
  slideIndex: 0,
  timer: null
};

const $ = (id) => document.getElementById(id);

function setMessage(message = "", type = "") {
  const el = $("loginMessage");
  if (!el) return;
  el.textContent = message;
  el.className = "form-message" + (type ? ` ${type}` : "");
}

function setLoading(loading) {
  const button = $("submitButton");
  if (!button) return;
  button.disabled = loading;
  button.classList.toggle("is-loading", loading);
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

async function submitLogin(payload) {
  const response = await fetch(API.login, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  const body = await readJson(response);

  if (!response.ok || body.success === false) {
    throw new Error(body.error || body.message || "Unable to sign in.");
  }

  return body;
}

function initSlideshow() {
  const slides = [...document.querySelectorAll(".slide")];
  const dots = [...document.querySelectorAll(".slide-dot")];
  if (!slides.length) return;

  const show = (index) => {
    state.slideIndex = index % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === state.slideIndex);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === state.slideIndex);
    });
  };

  const restart = () => {
    clearInterval(state.timer);
    state.timer = setInterval(() => show(state.slideIndex + 1), 6200);
  };

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      show(index);
      restart();
    });
  });

  restart();
}

function initPasswordToggle() {
  const input = $("password");
  const button = $("togglePassword");
  if (!input || !button) return;

  button.addEventListener("click", () => {
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    button.setAttribute(
      "aria-label",
      visible ? "Show password" : "Hide password"
    );
  });
}

async function handleLogin(event) {
  event.preventDefault();

  const username = $("username")?.value.trim();
  const password = $("password")?.value || "";
  const remember = $("remember")?.checked === true;

  setMessage("");

  if (!username || !password) {
    setMessage("Enter your username and password.", "error");
    return;
  }

  setLoading(true);

  try {
    await submitLogin({
      username,
      password,
      remember
    });

    setMessage("Signed in. Opening People Operations…", "success");

    window.setTimeout(() => {
      window.location.assign("/index.html");
    }, 200);
  } catch (error) {
    setMessage(
      error.message || "Unable to sign in.",
      "error"
    );
    setLoading(false);
  }
}

async function checkExistingSession() {
  try {
    const response = await fetch(API.session, {
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) return;

    const body = await readJson(response);

    if (body.authenticated) {
      window.location.replace("/index.html");
    }
  } catch {
    // Leave the login page available if the session endpoint is unavailable.
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initSlideshow();
  initPasswordToggle();
  $("loginForm")?.addEventListener("submit", handleLogin);
  checkExistingSession();
});
