import React from "react";
import { useState } from "react";
import Login from './Login'
import Register from './Register'

function Authentication() {
    const [status, setStatus] = useState("signin")

    function Text({status}){

      if(status == "signin"){
          return(
              <>
                <span className='redirect-link' onClick={() => setStatus("signup")}>Register new account</span>
                <button className='submit'>Đăng Nhập</button>
              </>
          )
      }
      else if(status == "signup"){
          return(
            <>
              <span className='redirect-link' onClick={() => setStatus("signin")}>Have account</span>
              <button className='submit'>Đăng Ký</button>
            </>
          )
      }
  }


  return (
    <div className='auth-container'>
        <div className='background-container'></div>
        {
            status === "signin" ? <Login text={<Text status="signin"></Text>}></Login> : <Register text={<Text status="signup"></Text>}></Register>
        }
    </div>
  )
}

export default Authentication