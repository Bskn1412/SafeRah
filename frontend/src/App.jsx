import { Routes, Route } from "react-router-dom";;
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import HeroVideo from "./pages/HeroVideo";
import { Avatar } from "./components/Avatar";
import {Help} from "./pages/Help";
import Mp from "./Mp";
import ForgotPassword from "./pages/ForgotPassword";
import Authenticator from "./pages/Authenticator";
import RecoveryGuard from "./components/RecoveryGuard";
import AuthPanel from "./pages/AuthPanel";
import RecoveryModel from "./components/RecoveryModel";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import RegTest from "./pages/RegTest";
import EncryptedUploader from "./pages/EncryptUploader";
import EmailAuth from "./pages/EmailAuth";

function App() {
  return (
    <>
     <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="dark"
      />
      <Routes>

        <Route path="/" element={<Home />} />
        <Route path="/video" element={<HeroVideo />}></Route>
        <Route path="/register" element={<AuthPanel />} />
        <Route path="/login" element={<AuthPanel />} />
        <Route path="/panel" element={<AuthPanel />} />

        <Route path="/dashboard" element={ <RecoveryGuard><Dashboard /></RecoveryGuard>} />

        <Route path="/avatar" element={<Avatar />} />
        <Route path="/help" element={<Help />} />
        <Route path="/apppp" element={<Mp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/authenticator" element={<Authenticator />} />
        <Route path="/recovery" element={<RecoveryModel />} />


        <Route path="/regtest" element={<RegTest />} />
        {/* For Sanity */}
        <Route path="/eupload" element={<EncryptedUploader />} />
        <Route path="/email-auth" element={<EmailAuth />} />

      </Routes>

    </>
  );
}

export default App;
