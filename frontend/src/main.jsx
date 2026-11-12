import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";

import SignIn from "./components/SignIn";
import SignUp from "./components/SignUp";
import Dashboard from "./pages/Dashboard";
import Room from "./pages/Room";
import EditRoomForm from "./components/EditRoomForm";
import Service from "./pages/Service";
import ServiceForm from "./pages/ServiceForm";
import AddCustomerForm from "./components/AddCustomerForm";
import Electric from "./pages/Electric.jsx";
import Water from "./pages/Water.jsx";
import Welcome from "./pages/Welcome.jsx";
import Customer from "./pages/Customer.jsx";
import Payments from "./pages/Payment.jsx";
import BookingPlanner from "./pages/BookingPlanner.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import SessionNotice from "./components/SessionNotice.jsx";
import { bindSessionNavigation } from "./utils/authSession.js";
const router = createBrowserRouter([
  {
    element: <><SessionNotice /><Outlet /></>,
    children: [
      { path: "/", element: <Welcome /> },
      { path: "/login", element: <SignIn /> },
      { path: "/register", element: <SignUp /> },
      {
        element: <RequireAuth />,
        children: [
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/rooms", element: <Room /> },
          { path: "/rooms/edit/:id", element: <EditRoomForm /> },
          { path: "/add-customer/:roomId", element: <AddCustomerForm /> },
          { path: "/add-customer/:roomId/:contractId", element: <AddCustomerForm /> },
          { path: "/service", element: <Service /> },
          { path: "/service/edit", element: <ServiceForm /> },
          { path: "/electric", element: <Electric /> },
          { path: "/water", element: <Water /> },
          { path: "/customer", element: <Customer /> },
          { path: "/payment", element: <Payments /> },
          { path: "/booking-planner", element: <BookingPlanner /> },
        ],
      },
    ],
  },
]);
bindSessionNavigation((path, options) => router.navigate(path, options));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
