"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactCountryFlag from "react-country-flag";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { registerUser, RegisterRequest } from "../../lib/api";
import { COUNTRY_CODES } from "../../lib/countryCodes";

interface AddRegistrationFormProps {
  onCancel: () => void;
  onRegister: () => void;
}

/* ─── Chevron Icon ─── */
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/* ─── Localized Mobile Input to match SignupForm ─── */
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

  const selectedCountry = COUNTRY_CODES.find((c) => c.dial_code === countryCode) || COUNTRY_CODES.find((c) => c.code === "IN") || COUNTRY_CODES[0];
  const filteredCodes = COUNTRY_CODES.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.dial_code.includes(search)
  );

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-black dark:text-white ml-1">
        Mobile Number <span className="text-red-500">*</span>
      </label>
      <div className="relative flex">
        {/* Country Selector */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 h-12 px-4 bg-brand-light-tertiary dark:bg-brand-dark-tertiary border ${error ? "border-red-400" : "border-brand-light-tertiary dark:border-brand-dark-tertiary"} rounded-l-full text-sm font-medium text-black dark:text-white hover:bg-brand-green/5 transition-colors min-w-[90px] cursor-pointer`}
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
          className={`flex-1 h-12 px-5 bg-brand-light-secondary dark:bg-brand-dark-tertiary border ${error ? "border-red-400 ring-1 ring-red-200" : "border-brand-light-tertiary dark:border-brand-dark-tertiary"} rounded-r-full text-sm font-normal text-black dark:text-white outline-none transition-all focus:border-brand-green focus:ring-2 focus:ring-brand-green/20`}
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
                className="w-full px-3 py-2 bg-brand-light-tertiary dark:bg-brand-dark-tertiary rounded-lg text-sm outline-none focus:border-brand-green text-black dark:text-white"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredCodes.map((c) => (
                <button
                  key={c.code + c.dial_code}
                  type="button"
                  onClick={() => { onCountryChange(c.dial_code); setIsOpen(false); setSearch(""); }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 hover:bg-brand-green/5 hover:text-brand-green transition-colors ${countryCode === c.dial_code ? "bg-brand-green/10 text-brand-green" : "text-black dark:text-white"}`}
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

const AddRegistrationForm: React.FC<AddRegistrationFormProps> = ({
  onCancel,
  onRegister,
}) => {
  const [formData, setFormData] = useState<RegisterRequest>({
    fullName: "",
    gender: "FEMALE",
    email: "",
    countryCode: "+91",
    mobileNumber: "",
    password: "",
    role: "STUDENT",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (field: keyof RegisterRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    setError(null);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) errors.fullName = "Required";
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Enter a valid email address";
    }
    if (!formData.mobileNumber.trim()) errors.mobileNumber = "Required";
    if (!formData.password?.trim()) {
      errors.password = "Required";
    } else {
      const pwd = formData.password;
      if (pwd.length < 8) errors.password = "Minimum 8 characters";
      else if (!/[A-Z]/.test(pwd)) errors.password = "Must contain 1 uppercase letter";
      else if (!/[a-z]/.test(pwd)) errors.password = "Must contain 1 lowercase letter";
      else if (!/[0-9]/.test(pwd)) errors.password = "Must contain 1 number";
      else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd))
        errors.password = "Must contain 1 special character";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setError("Please fill in all required fields correctly.");
      return;
    }
    setIsLoading(true);
    try {
      await registerUser(formData);
      onRegister();
    } catch (err: any) {
      console.error("Registration Error:", err);
      let message = err.message || "Failed to create registration.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    handleInputChange("password", pwd);
    setShowPassword(true);
  };

  const baseInputClasses =
    "w-full h-12 bg-brand-light-secondary dark:bg-brand-dark-tertiary border border-brand-light-tertiary dark:border-brand-dark-tertiary rounded-full px-5 text-sm font-normal text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 outline-none transition-all focus:border-brand-green focus:ring-2 focus:ring-brand-green/20";

  const baseLabelClasses = "block text-xs font-semibold uppercase tracking-wider text-black dark:text-white ml-1";
  const baseSectionTitleClasses = "text-xs font-semibold uppercase tracking-wider text-brand-green mb-6 block";
  const toggleWrapperClasses = "flex w-full h-12 bg-brand-light-tertiary dark:bg-brand-dark-tertiary rounded-full p-1 border border-brand-light-tertiary dark:border-brand-dark-tertiary";
  const toggleButtonBase = "flex-1 text-[10px] md:text-xs font-semibold uppercase tracking-wide rounded-full transition-all duration-300 cursor-pointer";
  const activeToggleClasses = "bg-brand-green text-white shadow-md";
  const inactiveToggleClasses = "text-black dark:text-white hover:text-brand-green";

  return (
    <div className="w-full font-sans animate-fade-in pb-12">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8">
        <div>
          <div className="flex items-center text-xs text-black dark:text-white mb-1.5 font-normal flex-wrap">
            <span>Dashboard</span>
            <span className="mx-2 text-gray-400 dark:text-gray-600">
              <ArrowRight className="w-3 h-3 text-black dark:text-white" />
            </span>
            <button onClick={onCancel} className="hover:text-brand-text-light-primary dark:hover:text-white hover:underline cursor-pointer">
              Users
            </button>
            <span className="mx-2 text-gray-400 dark:text-gray-600">
              <ArrowRight className="w-3 h-3 text-black dark:text-white" />
            </span>
            <span className="text-brand-green font-semibold">Add User</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-brand-text-light-primary dark:text-white tracking-tight">
            Add User
          </h1>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-brand-dark-secondary border border-gray-200 dark:border-brand-dark-tertiary rounded-3xl p-6 sm:p-10 shadow-sm dark:shadow-xl transition-colors duration-300 relative">
        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mb-8">
          <h2 className={baseSectionTitleClasses}>Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className={baseLabelClasses}>Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                placeholder="Enter full name"
                className={`${baseInputClasses} ${formErrors.fullName ? "border-red-400 ring-1 ring-red-200" : ""}`}
              />
              {formErrors.fullName && <p className="text-red-500 text-xs ml-1 mt-1">{formErrors.fullName}</p>}
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label className={baseLabelClasses}>Gender <span className="text-red-500">*</span></label>
              <div className={toggleWrapperClasses}>
                {["MALE", "FEMALE", "OTHER"].map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => handleInputChange("gender", gender)}
                    className={`${toggleButtonBase} ${formData.gender === gender ? activeToggleClasses : inactiveToggleClasses}`}
                  >
                    {gender.charAt(0) + gender.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className={baseLabelClasses}>Email Address <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="name@example.com"
                className={`${baseInputClasses} ${formErrors.email ? "border-red-400 ring-1 ring-red-200" : ""}`}
              />
              {formErrors.email && <p className="text-red-500 text-xs ml-1 mt-1">{formErrors.email}</p>}
            </div>

            {/* Mobile Number */}
            <MobileInput
              countryCode={formData.countryCode}
              phoneNumber={formData.mobileNumber}
              onCountryChange={(code) => handleInputChange("countryCode", code)}
              onPhoneChange={(num) => handleInputChange("mobileNumber", num)}
              error={formErrors.mobileNumber}
            />
            
            {/* Role Toggle */}
            <div className="space-y-1.5">
              <label className={baseLabelClasses}>Role <span className="text-red-500">*</span></label>
              <div className={toggleWrapperClasses}>
                {["STUDENT", "PROCTOR", "ADMIN"].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleInputChange("role", role)}
                    className={`${toggleButtonBase} ${formData.role === role ? activeToggleClasses : inactiveToggleClasses}`}
                  >
                    {role.charAt(0) + role.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Password input + Generate Password button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={baseLabelClasses}>Password <span className="text-red-500">*</span></label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-xs font-semibold cursor-pointer text-brand-green hover:underline ml-1"
                >
                  Generate Password
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Min 8 characters"
                  className={`${baseInputClasses} pr-12 ${formErrors.password ? "border-red-400 ring-1 ring-red-200" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black hover:text-brand-green dark:text-white dark:hover:text-brand-green transition-colors cursor-pointer"
                >
                  {showPassword ? <Eye className="w-5 h-5 text-brand-green" /> : <EyeOff className="w-5 h-5 text-brand-green" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-red-500 text-xs ml-1 mt-1">{formErrors.password}</p>
              )}
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 mt-8">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto px-10 h-12 rounded-full border border-gray-300 dark:border-white/10 text-black dark:text-white font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full sm:w-auto px-12 h-12 rounded-full bg-brand-green hover:bg-brand-green/90 text-white font-bold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 text-sm flex justify-center items-center cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Creating...
              </>
            ) : (
              "Add User"
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddRegistrationForm;
