//connecting our frontend to the supabase backend and authentication system
const supabaseUrl = "https://ovbnnyrdnispdwvgknvp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92Ym5ueXJkbmlzcGR3dmdrbnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTc3NzAsImV4cCI6MjA5MDEzMzc3MH0.ly2TlJ7zYZ8_BsbRxU-fFbORC3eq7crsjcBM3xYXwFE";

//creating a supabase client object so we can use the authorization functions provided
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

//getting buttons from html to switch between sign in and sign up
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
//function to show the sign in form and hide sign ip form
function showSignin() {
  signinForm.style.display = "block";
  signupForm.style.display = "none";

  showSigninBtn.classList.add("active");
  showSignupBtn.classList.remove("active");

  authTitle.textContent = "Welcome back.";
  authSubtitle.textContent = "Sign in to discover new releases and track films you love.";
}
//function to show sign up form and hide sign in form
function showSignup() {
  signinForm.style.display = "none";
  signupForm.style.display = "block";

  showSignupBtn.classList.add("active");
  showSigninBtn.classList.remove("active");

  authTitle.textContent = "Create account.";
  authSubtitle.textContent = "Sign up to start saving and discovering movies.";
}

async function signUp() {
  //getting the email id and password from the user
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  //base check
  if (!email || !password) {
    alert("Please enter both email and password");
    return;
  }
  //sending email to supabase to create the account
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password
  });
  //debug checking
  console.log("Sign up result:", data, error);
  //if an error occur a pop up shows up
  if (error) {
    alert("Error: " + error.message);
    return;
  }

  alert("Account created. Now sign in.");
  showSignin();
}
//Handles signing in an existing user with Supabase Auth
async function signIn() {
  //get the email and password entered by the user
  const email = document.getElementById("signin-email").value;
  const password = document.getElementById("signin-password").value;
  //error checking if either fields r empty
  if (!email || !password) {
    alert("Please enter both email and password");
    return;
  }
  //asking supabase to sign the user in with their email and password
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });
  //debug checking
  console.log("Sign in result:", data, error);
  //if theres an error then a pop up shows on users screen
  if (error) {
    alert("Error: " + error.message);
    return;
  }
  //saving the logged in users session info in localstorage to let other pages know the user is authenticated
  localStorage.setItem("access_token", data.session.access_token);
  localStorage.setItem("user_email", data.user.email);
  localStorage.setItem("user_id", data.user.id);
  //sending the user to the home page after a sucessful login
  window.location.href = "home.html";
}