import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Argon from "./pages/Argon";
import Home from "./pages/Home";
import HeroVideo from "./pages/HeroVideo";
import { Avatar } from "./components/Avatar";
import {Help} from "./pages/Help";
import ProtectedRoute from "./components/ProtectedRoute";
import Mp from "./Mp";
import ForgotPassword from "./pages/ForgotPassword";

import EnableRecovery from "./pages/EnableRecovery";
import SetupRecovery from "./pages/SetupRecovery";

import Authenticator from "./pages/Authenticator";

import RecoveryGuard from "./components/RecoveryGuard";

function App() {
  return (
      <Routes>

        <Route path="/" element={<Home />} />
        <Route path="/video" element={<HeroVideo />}></Route>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={ <RecoveryGuard><Dashboard /></RecoveryGuard>} />

        <Route path="/avatar" element={<Avatar />} />
        <Route path="/help" element={<Help />} />
        <Route path="/apppp" element={<Mp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/enable-recovery" element={<EnableRecovery />} />
        <Route path="/setup-recovery" element={<SetupRecovery />} />
        <Route path="/authenticator" element={<Authenticator />} />


      </Routes>
  );
}

export default App;
