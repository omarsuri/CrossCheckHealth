"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";

const toAppUser = (user) => ({
  id: user.id,
  name: user.user_metadata?.full_name || user.email,
  email: user.email,
});

const saveUserProfile = async (user, fallbackName) => {
  try {
    const response = await fetch("/api/users/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || fallbackName,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error?.message || "Failed to save user profile");
    }
  } catch (error) {
    console.error("Save user profile failed:", error);
  }
};

export const LoginModal = ({ isOpen, onClose, onLogin }) => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (mode === "signup" && (!consent || !privacy)) {
        throw new Error("Please accept the consent and policy checkboxes to create an account.");
      }

      const { data, error } = mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        });

      if (error) throw error;

      if (data.session && data.user) {
        saveUserProfile(data.user, name);
        onLogin(toAppUser(data.user));
        onClose();
        return;
      }

      if (mode === "signup") {
        setSuccessMessage("Please check your email to verify your account.");
        return;
      }

      throw new Error("We could not start a session. Please try again.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
      if (error) throw error;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Google login could not be started. Please try again.");
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setErrorMessage("");
    setSuccessMessage("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-teal-soft rounded-xl flex items-center justify-center mx-auto mb-4">
          <Icon name="heart" size={24} className="text-teal-deep" />
        </div>
        <h2 className="text-2xl font-bold text-charcoal">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p className="text-gray-500 mt-1 text-sm">Track your health and care for your family</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none transition-all" placeholder="Your full name" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none transition-all" placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none transition-all" placeholder="••••••••" />
        </div>
        {mode === "signup" && (
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" />
              <span className="text-sm text-gray-600">I consent to health awareness assessments and understand this is not medical advice.</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} className="mt-1" />
              <span className="text-sm text-gray-600">I agree to the Privacy Policy, Terms of Use, Medical Disclaimer, Cookie Policy, and Refund & Cancellation Policy.</span>
            </label>
          </div>
        )}
        {errorMessage && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{errorMessage}</p>}
        {successMessage && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">{successMessage}</p>}
        <Button type="submit" variant="primary" fullWidth disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}</Button>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">or continue with</span></div>
        </div>
        <Button variant="outline" fullWidth icon="user" onClick={handleGoogleLogin} disabled={loading}>Continue with Google</Button>
        <p className="text-center text-sm text-gray-500 mt-4">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button type="button" onClick={switchMode} className="text-teal-deep font-medium hover:underline">
            {mode === "login" ? "Create one" : "Sign in"}
          </button>
        </p>
      </form>
    </Modal>
  );
};
