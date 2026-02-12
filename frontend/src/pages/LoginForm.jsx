import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock} from "lucide-react";
import { Link, useNavigate} from "react-router-dom";
import { api } from "../api";
import { toast } from "react-toastify";
import "../toast.css";

export default function LoginForm({ textVariants }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();



  const errorMap = {
  MISSING_FIELDS: "Please fill in all fields",
  INVALID_CREDENTIALS: "Email or password is incorrect",
  ACCOUNT_LOCKED: "Your account is temporarily locked",
  SERVER_ERROR: "Server error. Try again later",
};



  const submit = async (e) => {
  e.preventDefault();
  if (isLoading) return;

  if (!form.email || !form.password) {
    toast.error("Please enter both email and password");
    return;
  }

  setIsLoading(true);

  try {
    const res = await api.post("/auth/login", form);

    toast.success(res.data?.message || "Welcome back!");

    setTimeout(() => {
      navigate("/dashboard");
    }, 800);

  } catch (err) {
    const code = err.response?.data?.code;

    toast.error(
      errorMap[code] ||
      err.response?.data?.message ||
      "Unable to login"
    );

  } finally {
    setIsLoading(false);
  }
};



     const handleChange = (e) => {
      setForm({ ...form, [e.target.name]: e.target.value });
  };
    

  return (
    <motion.form
      onSubmit={submit}
      variants={textVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full max-w-sm space-y-5 text-white">
      
      <h3 className="text-3xl font-black">Sign In</h3>
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-400" />
        <input
          name="email"
                  type="email"
                  value={form.email}
                  placeholder="E-Mail"
                  required
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3 bg-black/20 border border-emerald-500/30 hover:border-zinc-800/90 focus:border-cyan-400 rounded-lg text-white placeholder-white/70 focus:bg-black/30 focus:ring-2 focus:ring-cyan-400/30 transition disabled:opacity-50"
                />
      </div>
      
      <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-400" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password" required
            name="password"
            onChange={handleChange}
            disabled={isLoading}
            className="w-full pl-12 pr-12 py-3 bg-black/20 border border-emerald-500/30 hover:border-zinc-800/90 focus:border-cyan-400 rounded-lg text-white placeholder-white/70 focus:bg-black/30 focus:ring-2 focus:ring-cyan-400/30 transition disabled:opacity-50"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
      </div>

      <motion.button
      type="submit"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        disabled={isLoading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold cursor-pointer"
      >
        {isLoading ? "Loading..." : "Sign In"}
      </motion.button>


      <div className="flex flex-col items-center gap-4">
        <Link
          to="/forgot-password"
          className="text-md font-bold text-white no-underline hover:underline hover:text-zinc-700 transition whitespace-nowrap"
        >
          Forgot your password?
        </Link>

        { /*

          <p className="text-center text-white text-sm">
            Don’t have an account.?
            <Link
              to="/register"
              className="ml-2 text-xl text-zinc-800 transition font-bold hover:underline hover:text-purple-700 transition whitespace-nowrap"
            >
              Sign up
            </Link>
          </p>
        */}
      </div> 

    </motion.form>   
  );
}
