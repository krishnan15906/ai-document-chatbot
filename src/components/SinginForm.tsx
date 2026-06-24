"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Check, X } from "lucide-react";

export default function SinginForm() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Input fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Toggle visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation / Loading states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Password strength checks
  const [passwordStrength, setPasswordStrength] = useState(0); // 0 to 4
  const [checks, setChecks] = useState({
    length: false,
    number: false,
    capital: false,
    special: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const hasLength = password.length >= 8;
    const hasNumber = /[0-9]/.test(password);
    const hasCapital = /[A-Z]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    setChecks({
      length: hasLength,
      number: hasNumber,
      capital: hasCapital,
      special: hasSpecial,
    });

    let strength = 0;
    if (hasLength) strength++;
    if (hasNumber) strength++;
    if (hasCapital) strength++;
    if (hasSpecial) strength++;

    setPasswordStrength(strength);
  }, [password]);

  if (!mounted) {
    return (
      <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col items-center justify-center min-h-[580px]">
        <div className="h-6 w-32 bg-zinc-850 rounded-md mb-8 animate-pulse"></div>
        <div className="w-full space-y-6">
          <div className="h-10 bg-zinc-850 rounded-xl animate-pulse"></div>
          <div className="h-10 bg-zinc-850 rounded-xl animate-pulse"></div>
          <div className="h-10 bg-zinc-850 rounded-xl animate-pulse"></div>
          <div className="h-10 bg-zinc-850 rounded-xl animate-pulse"></div>
          <div className="h-12 bg-zinc-850 rounded-xl mt-8 animate-pulse"></div>
        </div>
      </div>
    );
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Full Name is required";
    }

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (passwordStrength < 3) {
      newErrors.password = "Password must be stronger";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!agreeTerms) {
      newErrors.terms = "You must agree to the Terms of Service";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Registration failed");
      }

      const data = await response.json();
      localStorage.setItem("token", data.access_token);
      
      // Redirect to dashboard on success
      router.push("/dashboard");
    } catch (err: any) {
      setGeneralError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthLabel = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return { label: "Weak", color: "bg-red-500", text: "text-red-400" };
      case 2:
        return { label: "Fair", color: "bg-amber-500", text: "text-amber-400" };
      case 3:
        return { label: "Good", color: "bg-blue-500", text: "text-blue-400" };
      case 4:
        return { label: "Strong", color: "bg-emerald-500", text: "text-emerald-400" };
      default:
        return { label: "Weak", color: "bg-red-500", text: "text-red-400" };
    }
  };

  const strength = getStrengthLabel();

  return (
    <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 shadow-2xl">
      <div className="flex flex-col space-y-2 text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
          Create Account
        </h2>
        <p className="text-sm text-zinc-400">
          Get started with your AI document chatbot in minutes
        </p>
      </div>

      {generalError && (
        <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-sm text-center">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Full Name Input */}
        <div className="space-y-2">
          <label htmlFor="name" className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
            Full Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
              <User className="h-4 w-4" />
            </div>
            <input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              disabled={isLoading}
              className={`w-full pl-11 pr-4 py-3 bg-zinc-950/80 border text-sm text-white placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 ${
                errors.name ? "border-red-500 focus:ring-red-500/30" : "border-zinc-800"
              }`}
            />
          </div>
          {errors.name && (
            <p className="text-xs text-red-400 mt-1 pl-1">{errors.name}</p>
          )}
        </div>

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
                if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
              }}
              disabled={isLoading}
              className={`w-full pl-11 pr-4 py-3 bg-zinc-950/80 border text-sm text-white placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 ${
                errors.email ? "border-red-500 focus:ring-red-500/30" : "border-zinc-800"
              }`}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-400 mt-1 pl-1">{errors.email}</p>
          )}
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <label htmlFor="password" className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
            Password
          </label>
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
                if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
              }}
              disabled={isLoading}
              className={`w-full pl-11 pr-11 py-3 bg-zinc-950/80 border text-sm text-white placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 ${
                errors.password ? "border-red-500 focus:ring-red-500/30" : "border-zinc-800"
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
          {errors.password && (
            <p className="text-xs text-red-400 mt-1 pl-1">{errors.password}</p>
          )}

          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <div className="mt-3 space-y-2 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/60">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-medium">Strength:</span>
                <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 h-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-full rounded-full transition-all duration-300 ${
                      level <= passwordStrength ? strength.color : "bg-zinc-800"
                    }`}
                  />
                ))}
              </div>
              {/* Individual requirements check list */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px] text-zinc-400">
                <div className="flex items-center gap-1.5">
                  {checks.length ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <X className="h-3 w-3 text-zinc-600" />
                  )}
                  <span>Min 8 characters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {checks.number ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <X className="h-3 w-3 text-zinc-600" />
                  )}
                  <span>At least one number</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {checks.capital ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <X className="h-3 w-3 text-zinc-600" />
                  )}
                  <span>One uppercase letter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {checks.special ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <X className="h-3 w-3 text-zinc-600" />
                  )}
                  <span>One special symbol</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Input */}
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword)
                  setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              disabled={isLoading}
              className={`w-full pl-11 pr-11 py-3 bg-zinc-950/80 border text-sm text-white placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 ${
                errors.confirmPassword ? "border-red-500 focus:ring-red-500/30" : "border-zinc-800"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 focus:outline-none"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-400 mt-1 pl-1">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Terms and Conditions */}
        <div className="space-y-1">
          <div className="flex items-start">
            <input
              id="terms"
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked);
                if (errors.terms) setErrors((prev) => ({ ...prev, terms: "" }));
              }}
              disabled={isLoading}
              className="mt-1 h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-violet-600 focus:ring-violet-500/50 focus:ring-offset-zinc-900"
            />
            <label htmlFor="terms" className="ml-2 text-sm text-zinc-400 cursor-pointer select-none">
              I agree to the{" "}
              <a href="#" className="text-violet-400 hover:underline" onClick={(e) => e.preventDefault()}>
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-violet-400 hover:underline" onClick={(e) => e.preventDefault()}>
                Privacy Policy
              </a>
            </label>
          </div>
          {errors.terms && (
            <p className="text-xs text-red-400 pl-1">{errors.terms}</p>
          )}
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
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="mt-8 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <a
          href="/login"
          className="font-semibold text-violet-400 hover:text-violet-300 transition-colors"
        >
          Sign in
        </a>
      </div>
    </div>
  );
}
