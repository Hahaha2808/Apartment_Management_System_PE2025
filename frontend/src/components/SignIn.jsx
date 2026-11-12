import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signIn } from "../utils/authSession.js";
import { isAuthHandledError } from "../utils/apiClient.js";
import "../styling/components/signin.scss";

function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [account, setAccount] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAccount({ ...account, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setErrorMessage("");
    try {
      const { user } = await signIn(account);
      alert("Login successful");
      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "landlord") {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      if (!isAuthHandledError(error)) {
        setErrorMessage(error.response?.data?.message || error.message || "Server error or invalid credentials");
      }
    } finally {
      setPending(false);
    }
  };

  const handleRedirectToRegister = () => {
    navigate("/register");
  };

  return (
    <div className="auth-container">
      <div className="background-container" />
      <div className="logo-fixed" onClick={() => navigate("/")}>
        🏢 DOMIS
      </div>
      <div className="signin-container">
        <form className="signin-inner" onSubmit={handleSubmit}>
          <span className="title">Log in</span>
          {location.state?.sessionNotice === "session-ended" && (
            <p className="signin-message" role="status">Your session has ended. Please log in again.</p>
          )}
          {errorMessage && <p className="signin-message" role="alert">{errorMessage}</p>}
          <div className="fields-container">
            <input
              type="email"
              name="email"
              value={account.email}
              onChange={handleChange}
              required
              placeholder="Email address*"
            />
            <input
              type="password"
              name="password"
              value={account.password}
              onChange={handleChange}
              required
              placeholder="Password*"
            />
            <p>Sessions expire 24 hours after login.</p>
          </div>
          <div className="divider"></div>
          <div className="submit-container">
            <button type="submit" className="submit-button" disabled={pending}>
              {pending ? "Logging in…" : "Login"}
            </button>
            <span className="redirect-link" onClick={handleRedirectToRegister}>
              Create an account
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SignIn;
