"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactCountryFlag from "react-country-flag";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { ApiError, registerUser } from "@/lib/api";
import { COUNTRY_CODES } from "@/lib/countryCodes";

/* ─── Chevron Icon ─── */
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/* ─── Mobile Input Component (Reference Style) ─── */
function MobileInput({
  countryCode,
  phoneNumber,
  onCountryChange,
  onPhoneChange,
  error,
}: {
  countryCode: string;
  phoneNumber: string;
  onCountryChange: (code: string) => void;
  onPhoneChange: (num: string) => void;
  error?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedCountry = COUNTRY_CODES.find((c) => c.dial_code === countryCode);
  const filteredCodes = COUNTRY_CODES.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.dial_code.includes(search)
  );

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 ml-1">
        Mobile Number <span className="text-red-500">*</span>
      </label>
      <div className="relative flex">
        {/* Country Selector */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 h-12 px-4 bg-brand-light-tertiary dark:bg-brand-dark-tertiary border ${error ? "border-red-400" : "border-brand-light-tertiary dark:border-brand-dark-tertiary"} border-r-0 rounded-l-full text-sm font-medium text-brand-text-light-primary dark:text-brand-text-primary hover:bg-brand-green/5 transition-colors min-w-[90px] cursor-pointer`}
        >
          <ReactCountryFlag
            countryCode={selectedCountry?.code || "IN"}
            svg
            style={{ width: "20px", height: "14px", borderRadius: "2px", objectFit: "cover" }}
          />
          <span className="text-xs font-semibold">{countryCode}</span>
          <ChevronDownIcon className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Phone Input */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            if (val.length <= (selectedCountry?.maxLength || 15)) onPhoneChange(val);
          }}
          placeholder="Enter mobile number"
          className={`flex-1 h-12 px-5 bg-brand-light-secondary dark:bg-brand-dark-tertiary border ${error ? "border-red-400 ring-1 ring-red-200" : "border-brand-light-tertiary dark:border-brand-dark-tertiary"} rounded-r-full text-sm font-normal text-slate-800 dark:text-brand-text-primary outline-none transition-all focus:border-brand-green focus:ring-2 focus:ring-brand-green/20`}
        />

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 top-full mt-1 left-0 w-64 bg-white dark:bg-brand-dark-secondary border border-brand-light-tertiary dark:border-brand-dark-tertiary rounded-xl shadow-xl max-h-64 overflow-hidden animate-in fade-in duration-200">
            <div className="p-2 border-b border-brand-light-tertiary dark:border-brand-dark-tertiary">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full px-3 py-2 bg-brand-light-tertiary dark:bg-brand-dark-tertiary rounded-lg text-sm outline-none focus:border-brand-green dark:text-brand-text-primary"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredCodes.map((c) => (
                <button
                  key={c.code + c.dial_code}
                  type="button"
                  onClick={() => { onCountryChange(c.dial_code); setIsOpen(false); setSearch(""); }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 hover:bg-brand-green/5 hover:text-brand-green transition-colors ${countryCode === c.dial_code ? "bg-brand-green/10 text-brand-green" : "text-brand-text-light-primary dark:text-brand-text-primary"}`}
                >
                  <ReactCountryFlag countryCode={c.code} svg style={{ width: "18px", height: "12px", borderRadius: "1px" }} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-[10px] font-semibold opacity-60">{c.dial_code}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-red-500 text-xs ml-1 mt-1">{error}</p>}
    </div>
  );
}

/* ─── Custom Select ─── */
function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  required,
  error,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="space-y-1.5" ref={ref}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 ml-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full h-12 bg-brand-light-secondary dark:bg-brand-dark-tertiary border ${error ? "border-red-400 ring-1 ring-red-200" : "border-brand-light-tertiary dark:border-brand-dark-tertiary"} rounded-full px-5 text-left text-sm font-medium text-brand-text-light-primary dark:text-brand-text-primary flex items-center justify-between transition-all hover:border-brand-green/50 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none cursor-pointer`}
        >
          <span className={selected ? "" : "text-brand-text-light-secondary dark:text-brand-text-secondary"}>
            {selected ? selected.label : placeholder || "Select..."}
          </span>
          <ChevronDownIcon className={`w-4 h-4 text-brand-text-light-secondary dark:text-brand-text-secondary transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-brand-dark-secondary border border-brand-light-tertiary dark:border-brand-dark-tertiary rounded-xl shadow-xl max-h-52 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-brand-green/5 hover:text-brand-green ${value === opt.value ? "bg-brand-green/10 text-brand-green" : "text-brand-text-light-primary dark:text-brand-text-primary"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-red-500 text-xs ml-1 mt-1">{error}</p>}
    </div>
  );
}

/* ═══════════════════════ SIGNUP FORM ═══════════════════════ */

interface SignupFormProps {
  onSignupSuccess?: (userName?: string) => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSignupSuccess }) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    gender: "MALE",
    email: "",
    countryCode: "+91",
    phone: "",
    password: "",
    role: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState("");

  const genderOptions = [
    { value: "MALE", label: "Male" },
    { value: "FEMALE", label: "Female" },
    { value: "OTHER", label: "Other" },
  ];

  const roleOptions = [
    { value: "SCHOOL_STUDENT", label: "School Student" },
    { value: "COLLEGE_STUDENT", label: "College Student" },
    { value: "EMPLOYEE", label: "Employee" },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setGeneralError("");
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!formData.name.trim()) nextErrors.name = "Full name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!formData.phone.trim()) nextErrors.phone = "Mobile number is required.";
    if (formData.password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (!formData.role) nextErrors.role = "Select your role.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    setGeneralError("");
    try {
      const session = await registerUser({
        email: formData.email,
        password: formData.password,
        fullName: formData.name,
        gender: formData.gender,
        countryCode: formData.countryCode,
        mobileNumber: formData.phone,
        role: formData.role,
      });
      onSignupSuccess?.(session.registration?.fullName || session.user.email);
    } catch (err) {
      setGeneralError(
        err instanceof ApiError
          ? err.message
          : "Unable to create account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {generalError && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-300">
          {generalError}
        </div>
      )}
      {/* Name & Gender */}
      <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr] gap-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 ml-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            className={`w-full h-12 bg-brand-light-secondary dark:bg-brand-dark-tertiary border ${formErrors.name ? "border-red-400 ring-1 ring-red-200" : "border-brand-light-tertiary dark:border-brand-dark-tertiary"} rounded-full px-5 text-sm font-normal text-slate-800 dark:text-brand-text-primary placeholder:text-brand-text-light-secondary dark:placeholder:text-brand-text-secondary outline-none transition-all focus:border-brand-green focus:ring-2 focus:ring-brand-green/20`}
            disabled={isSubmitting}
          />
          {formErrors.name && <p className="text-red-500 text-xs ml-1 mt-1">{formErrors.name}</p>}
        </div>

        {/* Gender Toggle (Reference Style) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 ml-1">
            Gender <span className="text-red-500">*</span>
          </label>
          <div className="relative w-full bg-brand-light-tertiary dark:bg-brand-dark-tertiary rounded-full p-1 flex h-12">
            {genderOptions.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, gender: g.value }))}
                className={`flex-1 text-[10px] md:text-xs font-semibold uppercase tracking-wide rounded-full transition-all duration-300 cursor-pointer ${
                  formData.gender === g.value
                    ? "bg-brand-green text-white shadow-md"
                    : "text-slate-500 dark:text-brand-text-secondary hover:text-brand-green"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 ml-1">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="name@example.com"
          className={`w-full h-12 bg-brand-light-secondary dark:bg-brand-dark-tertiary border ${formErrors.email ? "border-red-400 ring-1 ring-red-200" : "border-brand-light-tertiary dark:border-brand-dark-tertiary"} rounded-full px-5 text-sm font-normal text-slate-800 dark:text-brand-text-primary placeholder:text-brand-text-light-secondary dark:placeholder:text-brand-text-secondary outline-none transition-all focus:border-brand-green focus:ring-2 focus:ring-brand-green/20`}
          disabled={isSubmitting}
        />
        {formErrors.email && <p className="text-red-500 text-xs ml-1 mt-1">{formErrors.email}</p>}
      </div>

      {/* Mobile Input (Reference Style) */}
      <MobileInput
        countryCode={formData.countryCode}
        phoneNumber={formData.phone}
        onCountryChange={(code) => setFormData((prev) => ({ ...prev, countryCode: code, phone: "" }))}
        onPhoneChange={(num) => setFormData((prev) => ({ ...prev, phone: num }))}
        error={formErrors.phone}
      />

      {/* Password */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 ml-1">
          Password <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={passwordVisible ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Min 8 characters"
            className={`w-full h-12 bg-brand-light-secondary dark:bg-brand-dark-tertiary border ${formErrors.password ? "border-red-400 ring-1 ring-red-200" : "border-brand-light-tertiary dark:border-brand-dark-tertiary"} rounded-full px-5 pr-12 text-sm font-normal text-slate-800 dark:text-brand-text-primary placeholder:text-brand-text-light-secondary dark:placeholder:text-brand-text-secondary outline-none transition-all focus:border-brand-green focus:ring-2 focus:ring-brand-green/20`}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setPasswordVisible(!passwordVisible)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-light-secondary hover:text-brand-green dark:text-brand-text-secondary dark:hover:text-brand-green transition-colors cursor-pointer"
          >
            {passwordVisible ? <EyeIcon className="h-5 w-5 text-brand-green" /> : <EyeOffIcon className="h-5 w-5 text-brand-green" />}
          </button>
        </div>
        {formErrors.password && <p className="text-red-500 text-xs ml-1 mt-1">{formErrors.password}</p>}
      </div>

      {/* Role */}
      <CustomSelect
        label="Role"
        required
        options={roleOptions}
        value={formData.role}
        onChange={(val) => {
          setFormData((prev) => ({ ...prev, role: val }));
          setFormErrors((prev) => ({ ...prev, role: "" }));
        }}
        placeholder="Select your role"
        error={formErrors.role}
      />

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-14 mt-2 bg-brand-green hover:bg-brand-green/90 text-white text-base font-bold rounded-full transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:bg-brand-green/50"
      >
        {isSubmitting ? "Creating..." : "Create Account"}
      </button>
    </form>
  );
};

export default SignupForm;
