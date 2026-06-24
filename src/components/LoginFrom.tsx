"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

export default function LoginFrom() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Validation states
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col items-center justify-center min-h-[450px]">
        <div className="h-6 w-32 bg-zinc-850 rounded-md mb-8 animate-pulse"></div>
        <div className="w-full space-y-6">
          <div className="h-10 bg-zinc-850 rounded-xl animate-pulse"></div>
          <div className="h-10 bg-zinc-850 rounded-xl animate-pulse"></div>
          <div className="h-12 bg-zinc-850 rounded-xl mt-8 animate-pulse"></div>
        </div>
      </div>
    );
  }

  const validateForm = () => {
    let isValid = true;
    
    // Email check
    if (!email) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    } else {
      setEmailError("");
    }

    // Password check
    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      isValid = false;
    } else {
      setPasswordError("");
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");

    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const response = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Invalid credentials");
      }

      const data = await response.json();
      localStorage.setItem("token", data.access_token);
      
      // Redirect to dashboard on success
      router.push("/dashboard");
    } catch (err: any) {
      setGeneralError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 shadow-2xl">
      <div className="flex flex-col space-y-2 text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
          Welcome Back
        </h2>
        <p className="text-sm text-zinc-400">
          Enter your credentials to access your chatbot dashboard
        </p>
      </div>

      {generalError && (
        <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-sm text-center">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Email Input */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              disabled={isLoading}
              className={`w-full pl-11 pr-4 py-3 bg-zinc-950/80 border text-sm text-white placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 ${
                emailError ? "border-red-500 focus:ring-red-500/30" : "border-zinc-800"
              }`}
            />
          </div>
          {emailError && (
            <p className="text-xs text-red-400 mt-1 pl-1" id="email-error">
              {emailError}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label htmlFor="password" className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
              Password
            </label>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
              disabled={isLoading}
              className={`w-full pl-11 pr-11 py-3 bg-zinc-950/80 border text-sm text-white placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 ${
                passwordError ? "border-red-500 focus:ring-red-500/30" : "border-zinc-800"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 focus:outline-none"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {passwordError && (
            <p className="text-xs text-red-400 mt-1 pl-1" id="password-error">
              {passwordError}
            </p>
          )}
        </div>

        {/* Remember me checkbox */}
        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-violet-600 focus:ring-violet-500/50 focus:ring-offset-zinc-900"
          />
          <label htmlFor="remember-me" className="ml-2 text-sm text-zinc-400 cursor-pointer select-none">
            Keep me signed in
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-xl shadow-lg shadow-violet-950/20 hover:shadow-violet-950/40 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying account...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Sign Up */}
      <div className="mt-8 text-center text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <a
          href="/singin"
          className="font-semibold text-violet-400 hover:text-violet-300 transition-colors"
        >
          Sign up for free
        </a>
      </div>
    </div>
  );
}
