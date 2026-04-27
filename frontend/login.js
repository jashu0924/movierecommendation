const supabaseUrl = "https://ovbnnyrdnispdwvgknvp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92Ym5ueXJkbmlzcGR3dmdrbnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTc3NzAsImV4cCI6MjA5MDEzMzc3MH0.ly2TlJ7zYZ8_BsbRxU-fFbORC3eq7crsjcBM3xYXwFE";

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const showSigninBtn = document.getElementById("show-signin");
const showSignupBtn = document.getElementById("show-signup");
const bottomSignup = document.getElementById("bottom-signup");
const bottomSignin = document.getElementById("bottom-signin");

const signinForm = document.getElementById("signin-form");
const signupForm = document.getElementById("signup-form");

const authTitle = document.getElementById("auth-title");
const authSubtitle = document.getElementById("auth-subtitle");

document.getElementById("test-signup-btn").addEventListener("click", signUp);
document.getElementById("test-signin-btn").addEventListener("click", signIn);

showSigninBtn.addEventListener("click", showSignin);
showSignupBtn.addEventListener("click", showSignup);
bottomSignup.addEventListener("click", showSignup);
bottomSignin.addEventListener("click", showSignin);

function showSignin() {
  signinForm.style.display = "block";
  signupForm.style.display = "none";

  showSigninBtn.classList.add("active");
  showSignupBtn.classList.remove("active");

  authTitle.textContent = "Welcome back.";
  authSubtitle.textContent = "Sign in to discover new releases and track films you love.";
}

function showSignup() {
  signinForm.style.display = "none";
  signupForm.style.display = "block";

  showSignupBtn.classList.add("active");
  showSigninBtn.classList.remove("active");

  authTitle.textContent = "Create account.";
  authSubtitle.textContent = "Sign up to start saving and discovering movies.";
}

async function signUp() {
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  if (!email || !password) {
    alert("Please enter both email and password");
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  console.log("Sign up result:", data, error);

  if (error) {
    alert("Error: " + error.message);
    return;
  }

  alert("Account created. Now sign in.");
  showSignin();
}

async function signIn() {
  const email = document.getElementById("signin-email").value;
  const password = document.getElementById("signin-password").value;

  if (!email || !password) {
    alert("Please enter both email and password");
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  console.log("Sign in result:", data, error);

  if (error) {
    alert("Error: " + error.message);
    return;
  }

  localStorage.setItem("access_token", data.session.access_token);
  localStorage.setItem("user_email", data.user.email);
  localStorage.setItem("user_id", data.user.id);

  window.location.href = "home.html";
}