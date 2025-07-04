import React from "react";
import "../styling/auth.scss";
import { useState } from "react";
import SignIn from "../components/SignIn";
import SignUp from "../components/SignUp";

function Authentication() {
  const [status, setStatus] = useState("signin");

  function Text({ status }) {
    if (status == "signin") {
      return (
        <>
          <span className="redirect-link" onClick={() => setStatus("signup")}>
            Create an account
          </span>
          <button className="submit">Sign In</button>
        </>
      );
    } else if (status == "signup") {
      return (
        <>
          <span className="redirect-link" onClick={() => setStatus("signin")}>
            Already signed up?
          </span>
          <button className="submit">Register</button>
        </>
      );
    }
  }
}

function Authentication({ mode = "signin" }) {
  return (
    <div className="auth-container">
      <div className="background-container"></div>
      {mode === "signin" ? <SignIn /> : <SignUp />}
    </div>
  );
}

export default Authentication;
