import React from "react";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { authApi } from "../utils/apiClient.js";
import "../styling/components/signup.scss";
function SignUp() {
  const navigate = useNavigate();

  const [fullname, setFullname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone_number, setPhoneNumber] = useState("");

  const formData = {
    fullname,
    username,
    email,
    password,
    phone_number,
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (
      !fullname.trim() ||
      !username.trim() ||
      !email.trim() ||
      !password.trim() ||
      !phone_number.trim()
    ) {
      alert("All fields are required.");
      return;
    }

    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Invalid email format.");
      return;
    }

    // Password length
    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    // Phone number format (basic)
    const phoneRegex = /^[0-9]{8,15}$/;
    if (!phoneRegex.test(phone_number)) {
      alert("Invalid phone number. Must be 8-15 digits.");
      return;
    }

    // Data to send
    const formData = { fullname, username, email, password, phone_number };

    authApi
      .post("/users/register", formData)
      .then((response) => {
        if (response.status === 201) {
          alert("Registration successful");
          navigate("/login");
        }
      })
      .catch((error) => {
        alert(error.response?.data?.message || "Registration failed. Please check your connection and try again.");
      });
  };
  const handleRedirectToLogin = () => {
    navigate("/login");
  };
  return (
    <div className="auth-container">
      <div className="background-container" />
      <div className="logo-fixed" onClick={() => navigate("/")}>
        🏢 DOMIS
      </div>
      <div className="signup-container">
        <form className="signup-inner" onSubmit={handleSubmit}>
          <span className="title">Register</span>
          <div className="fields-container">
            <input
              type="text"
              name="fullname"
              placeholder="Your fullname*"
              required
              onChange={(e) => setFullname(e.target.value)}
            />
            <input
              type="text"
              name="username"
              placeholder="Username*"
              required
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="email"
              name="email"
              placeholder="Email*"
              required
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              name="password"
              placeholder="Password*"
              required
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              type="text"
              name="phone_number"
              placeholder="Telephone number*"
              required
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <div className="divider"></div>
          <div className="submit-container">
            <button type="submit" className="submit-button">
              Register
            </button>
            <span className="redirect-link" onClick={handleRedirectToLogin}>
              Already have an account?
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
export default SignUp;
