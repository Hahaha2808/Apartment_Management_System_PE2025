import React from 'react';
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Authentication from './page/Authentication.jsx'
import Home from './page/Home.jsx'
import Login from './page/Login.jsx';
import Register from './page/Register';

import App from './App.jsx'
import { Toaster } from 'react-hot-toast';

const router = createBrowserRouter([
      {
        path: "/",
        element: <Authentication />,
      },
      {
        path: "/home",
        element: <Home/>,
      },
      {
        path: "/login",
        element: <Login/>,
      },
      {
        path: "/register",
        element: <Register/>,
      }
]);


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster position='bottom-right' toastOptions={{duration:2000}}/>
    <RouterProvider router={router}/>
  </StrictMode>
)



