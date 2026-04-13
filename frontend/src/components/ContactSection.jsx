import { useState } from "react";
import { toast } from "react-toastify";
import emailjs from "@emailjs/browser";

export default function ContactSection() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (loading) return;

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (!message.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    setLoading(true);

    const templateParams = {
      user_name: name,
      user_email: email,
      message: message,
    };

    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        templateParams,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
      );

      toast.success("Message sent successfully!");

      // reset form
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      console.error("EmailJS Error:", err);
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 bg-black">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-linear-to-br from-cyan-500/20 via-black to-emerald-500/20 animate-pulse"></div>
      {/* Neon grid */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(6,182,212,0.05)_25%,rgba(6,182,212,0.05)_26%,transparent_27%,transparent_74%,rgba(6,182,212,0.05)_75%,rgba(6,182,212,0.05)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(16,185,129,0.05)_25%,rgba(16,185,129,0.05)_26%,transparent_27%,transparent_74%,rgba(16,185,129,0.05)_75%,rgba(16,185,129,0.05)_76%,transparent_77%,transparent)] bg-[size:50px_50px]"></div>
      {/* Floating neon blobs */}
      <div className="absolute top-10 -left-20 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl mix-blend-screen animate-float"></div>
      <div className="absolute bottom-10 -right-20 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl mix-blend-screen animate-float-slow"></div>

    <section className="w-full max-w-3xl mx-auto mt-28 px-6 text-center">

      <h2 className="font-bodoni text-3xl font-bold mb-10">
        Contact / Feedback
      </h2>

      <div className="p-8 rounded-xl bg-[#1b1b3a] border border-cyan-400/20 backdrop-blur">

        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-4 p-3 rounded-lg bg-black border border-gray-700 text-sm outline-none"
        />
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-3 rounded-lg bg-black border border-gray-700 text-sm outline-none"
        />

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Your feedback..."
          className="w-full h-32 p-4 rounded-lg bg-black border border-gray-700 text-sm outline-none"
        />

        <button
            onClick={send}
            disabled={loading}
            className="mt-5 px-6 py-2 rounded-lg bg-linear-to-r from-cyan-400 to-blue-500 text-black font-semibold hover:scale-105 transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed "
          >
            {loading ? "Sending..." : "Send Message"}
          </button>

      </div>
    </section>
    </div>
  );
}