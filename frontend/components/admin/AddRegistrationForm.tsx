"use client";

import React, { useState } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import MobileInput from "../ui/MobileInput";
import { registerUser, RegisterRequest } from "../../lib/api";

interface AddRegistrationFormProps {
  onCancel: () => void;
  onRegister: () => void;
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
  const [activeField, setActiveField] = useState<string | null>(null);

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
    if (!formData.email.trim()) errors.email = "Required";
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
      setError("Please fill in all required fields.");
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
    "w-full h-[50px] bg-gray-50 dark:bg-white/10 border border-transparent dark:border-transparent rounded-xl px-4 text-sm text-black dark:text-white placeholder-black/40 dark:placeholder-white/70 focus:border-brand-green focus:outline-none transition-all";

  const baseLabelClasses = "text-xs text-black/70 dark:text-white font-semibold ml-1";
  const baseSectionTitleClasses = "text-base font-semibold text-brand-text-light-primary dark:text-white mb-6";
  const toggleWrapperClasses = "flex w-full h-[50px] bg-gray-100 dark:bg-white/10 rounded-full p-1 border border-transparent dark:border-transparent";
  const toggleButtonBase = "flex-1 text-sm font-normal rounded-full transition-all duration-300 cursor-pointer";
  const activeToggleClasses = "bg-brand-green text-white shadow-lg shadow-green-900/20";
  const inactiveToggleClasses = "text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white";

  return (
    <div className="w-full font-sans animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8">
        <div>
          <div className="flex items-center text-xs text-black dark:text-white mb-1.5 font-normal flex-wrap">
            <span>Dashboard</span>
            <span className="mx-2 text-gray-400 dark:text-gray-600">
              <ArrowRight className="w-3 h-3 text-black dark:text-white" />
            </span>
            <button onClick={onCancel} className="hover:text-brand-text-light-primary dark:hover:text-white hover:underline">
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

      <div className="bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-3xl p-5 sm:p-8 shadow-sm dark:shadow-xl transition-colors duration-300 relative">
        {error && (
          <div className="mb-6 text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-100 dark:border-red-500/20">
            {error}
          </div>
        )}

        <div className="mb-8">
          <h2 className={baseSectionTitleClasses}>Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            <div className="space-y-2">
              <label className={baseLabelClasses}>Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                placeholder="Example Name"
                className={`${baseInputClasses} ${formErrors.fullName ? "border-red-500/50" : ""}`}
              />
            </div>

            <div className="space-y-2">
              <label className={baseLabelClasses}>Gender <span className="text-red-500">*</span></label>
              <div className={toggleWrapperClasses}>
                {["MALE", "FEMALE", "OTHER"].map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => handleInputChange("gender", gender)}
                    className={`${toggleButtonBase} ${formData.gender === gender ? activeToggleClasses : inactiveToggleClasses}`}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className={baseLabelClasses}>Email Address <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="example@gmail.com"
                className={`${baseInputClasses} ${formErrors.email ? "border-red-500/50" : ""}`}
              />
            </div>

            <div
              className={`space-y-2 relative ${activeField === "mobile" ? "z-50" : "z-0"}`}
              onMouseEnter={() => setActiveField("mobile")}
              onMouseLeave={() => setActiveField(null)}
            >
              <MobileInput
                countryCode={formData.countryCode}
                phoneNumber={formData.mobileNumber}
                onCountryChange={(code) => handleInputChange("countryCode", code)}
                onPhoneChange={(num) => handleInputChange("mobileNumber", num)}
                label="Mobile Number"
                required
                error={formErrors.mobileNumber}
              />
            </div>
            
            <div className="space-y-2 lg:col-span-2">
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

            <div className="space-y-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <label className={baseLabelClasses}>Password <span className="text-red-500">*</span></label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-[11px] font-medium cursor-pointer text-brand-green hover:text-brand-green/80"
                >
                  Generate Password
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Set login password"
                  className={`${baseInputClasses} pr-12 ${formErrors.password ? "border-red-500/50" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center"
                >
                  {showPassword ? <Eye className="w-4 h-4 text-brand-green" /> : <EyeOff className="w-4 h-4 text-brand-green" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-xs text-red-500 ml-1 mt-1">{formErrors.password}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 mt-8">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="w-full sm:w-auto px-10 py-3.5 rounded-full border border-gray-300 dark:border-white/10 text-brand-text-light-primary dark:text-white font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full sm:w-auto px-12 py-3.5 rounded-full bg-brand-green text-white font-bold hover:bg-brand-green/90 shadow-lg shadow-green-900/20 transition-all disabled:opacity-50 text-sm flex justify-center items-center"
        >
          {isLoading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              Processing...
            </>
          ) : (
            "Add User"
          )}
        </button>
      </div>
    </div>
  );
};

export default AddRegistrationForm;
