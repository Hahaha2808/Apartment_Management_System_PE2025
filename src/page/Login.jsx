import React from "react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch} from "react-redux"
import { FaRegEyeSlash } from "react-icons/fa6";
import { FaRegEye } from "react-icons/fa6";
import { setUserDetails} from '../store/userSlice.js'

import toast from "react-hot-toast";
import Axios from '../ultils/Axios.js'
import SummaryApi from '../common/summaryAPI.js'
import fetchUserDetails from '../ultils/fetchUserDetails.js'



const Login = () => {

  const navigate = useNavigate()
  // const dispatch = useDispatch()
  const [showPassword, setShowPassword] = useState(false)

  const [data, setData] = useState({
      email: "",
      password: ""
  })

  const handleChange = (e) =>{
    const { name, value} = e.target

    setData((prevent) => {
      return{
        ...prevent,
        [name] : value
      }
    })
  }


  const handleSubmit = async (e) =>{
    e.preventDefault()
    try {
      const response = await Axios({
        ...SummaryApi.login,
        data: data
      }, {
        withCredentials: true
      })
      
      if(response.data.error){
          toast.error(response.data.message)
      }

      if(response.data.success){
          toast.success(response.data.message)
          localStorage.setItem('accesstoken',response.data.data.accesstoken)
          localStorage.setItem('refreshToken',response.data.data.refreshToken)

          // const userDetails = await fetchUserDetails()
          // dispatch(setUserDetails(userDetails.data))

          setData({
              email : "",
              password : "",
          })
          navigate("/home")
      }

  } catch (error) {
    console.log(error)
  }
  }

  const valideValue = Object.values(data).every(el => el)


return(
  <section className='w-full container mx-auto px-2'>
    <div className='bg-white my-4 w-full max-w-lg mx-auto rounded p-7'>

        <form className='grid gap-4 py-4' onSubmit={handleSubmit}>
            <div className='grid gap-1'>
                <label htmlFor='email'>Email :</label>
                <input
                    type='email'
                    id='email'
                    className='bg-blue-50 p-2 border rounded outline-none focus:border-primary-200'
                    name='email'
                    value={data.email}
                    onChange={handleChange}
                    placeholder='Enter your email'
                />
            </div>
            <div className='grid gap-1'>
                <label htmlFor='password'>Password :</label>
                <div className='bg-blue-50 p-2 border rounded flex items-center focus-within:border-primary-200'>
                    <input
                        type={showPassword ? "text" : "password"}
                        id='password'
                        className='w-full outline-none'
                        name='password'
                        value={data.password}
                        onChange={handleChange}
                        placeholder='Enter your password'
                    />
                    <div onClick={() => setShowPassword(prevent => !prevent)} className='cursor-pointer'>
                        {
                            showPassword ? (
                                <FaRegEye />
                            ) : (
                                <FaRegEyeSlash />
                            )
                        }
                    </div>
                </div>
                <Link to={"/forgot-password"} className='block ml-auto hover:text-primary-200'>Forgot password ?</Link>
            </div>

            <button disabled={!valideValue} className={` ${valideValue ? "bg-green-800 hover:bg-green-700" : "bg-gray-500" }    text-white py-2 rounded font-semibold my-3 tracking-wide`}>Login</button>

        </form>

        <p>
            Don't have account? <Link to={"/register"} className='font-semibold text-green-700 hover:text-green-800'>Register</Link>
        </p>
    </div>
  </section>
  )
}


export default Login