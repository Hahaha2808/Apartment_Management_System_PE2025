import { BrowserRouter as Router, Route } from "react-router-dom";

import Home from "./page/Home";
import Authentication from "./page/Authentication";
import Login from "./page/Login";
import Register from "./page/Register";


function App() {
    return(
        <>
        {/* <Router>
            <Route path="/" element={<Authentication/>}/>
            <Route path="/home" element={<Home/>}/>
            <Route path="/login" element={<Login/>}/>
            <Route path="/register" element={<Register/>}/>
        </Router> */}
        </>
    )
}

export default App