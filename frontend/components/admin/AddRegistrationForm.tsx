"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactCountryFlag from "react-country-flag";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { registerUser, RegisterRequest, getDepartments, assertRegistrationEmailAvailable, assertRegistrationPhoneAvailable, ApiError } from "../../lib/api";
import { COUNTRY_CODES } from "../../lib/countryCodes";
import { 
  PROGRAM_OPTIONS, 
  BOARD_OPTIONS, 
  SCHOOL_LEVELS, 
  SCHOOL_STREAMS 
} from "../../lib/constants";

interface AddRegistrationFormProps {
  onCancel: () => void;
  onRegister: () => void;
  initialGroupCode?: string;
}

/* ─── Chevron Icon ─── */
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/* ─── Mobile Input Component ─── */
function MobileInput({
  countryCode,
  phoneNumber,
  onCountryChange,
  onPhoneChange,
  error,
  onBlur,
}: {
  countryCode: string;
  phoneNumber: string;
  onCountryChange: (code: string) => void;
  onPhoneChange: (num: string) => void;
  error?: string;
  onBlur?: () => void;
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
      <label className="block text-xs font-semibold tracking-wider text-black dark:text-white ml-1">
        Mobile Number <span className="text-red-500">*</span>
      </label>
      <div className="relative flex">
        {/* Country Selector */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{ borderTopLeftRadius: "9999px", borderBottomLeftRadius: "9999px" }}
          className={`flex items-center gap-1.5 h-12 px-4 bg-brand-light-tertiary dark:bg-brand-dark-tertiary border ${error ? "border-red-400" : "border-brand-light-tertiary dark:border-brand-dark-tertiary"} text-sm font-medium text-black dark:text-white hover:bg-brand-green/5 transition-colors min-w-[90px] cursor-pointer`}
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
          onBlur={onBlur}
          placeholder="Enter mobile number"
          style={{ borderTopRightRadius: "9999px", borderBottomRightRadius: "9999px" }}
          className={`flex-1 h-12 px-5 bg-brand-light-secondary dark:bg-brand-dark-tertiary border ${error ? "border-red-400 ring-1 ring-red-200" : "border-brand-light-tertiary dark:border-brand-dark-tertiary"} text-sm font-normal text-black dark:text-white outline-none transition-all focus:border-brand-green focus:ring-2 focus:ring-brand-green/20`}
        />

        {/* Dropdown */}
        {isOpen && (
          <div 
            style={{ backgroundColor: "var(--admin-card-solid, #ffffff)" }}
            className="absolute z-50 top-full mt-1 left-0 w-64 border border-brand-light-tertiary dark:border-brand-dark-tertiary rounded-xl shadow-xl max-h-64 overflow-hidden animate-in fade-in duration-200"
          >
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

/* ─── Custom Select ─── */
function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  required,
  error,
  disabled,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
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
        <label className="block text-xs font-semibold tracking-wider text-black dark:text-white ml-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          style={{ borderRadius: "9999px" }}
          className={`w-full h-12 bg-brand-light-secondary dark:bg-brand-dark-tertiary border ${error ? "border-red-400 ring-1 ring-red-200" : "border-brand-light-tertiary dark:border-brand-dark-tertiary"} px-5 text-left text-sm font-medium text-black dark:text-white flex items-center justify-between transition-all hover:border-brand-green/50 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className={selected ? "" : "text-black/40 dark:text-white/40"}>
            {selected ? selected.label : placeholder || "Select..."}
          </span>
          <ChevronDownIcon className={`w-4 h-4 text-black dark:text-white transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div 
            style={{ backgroundColor: "var(--admin-card-solid, #ffffff)" }}
            className="absolute z-50 mt-1 w-full border border-brand-light-tertiary dark:border-brand-dark-tertiary rounded-xl shadow-xl max-h-52 overflow-y-auto"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-brand-green/5 hover:text-brand-green ${value === opt.value ? "bg-brand-green/10 text-brand-green" : "text-black dark:text-white"}`}
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

/* ═══════════════════════ ADD REGISTRATION FORM ═══════════════════════ */

const AddRegistrationForm: React.FC<AddRegistrationFormProps> = ({
  onCancel,
  onRegister,
  initialGroupCode,
}) => {
  const [formData, setFormData] = useState<RegisterRequest>({
    fullName: "",
    gender: "MALE",
    email: "",
    countryCode: "+91",
    mobileNumber: "",
    password: "",
    role: "STUDENT",
    programCode: "",
    schoolLevel: "",
    schoolStream: "",
    studentBoard: "",
    departmentDegreeId: "",
    currentYear: "",
    currentRole: "",
    roleDescription: "",
    groupCode: initialGroupCode || "",
    sendEmail: false,
    pricingPolicy: "free",
  });

  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (formData.programCode === "COLLEGE_STUDENT" && departments.length === 0) {
      setLoadingDepts(true);
      getDepartments()
        .then((data) => {
          const formatted = data.map((d: any) => ({ value: d.id, label: d.name }));
          setDepartments(formatted);
        })
        .catch((err) => {
          console.error("Failed to load departments:", err);
        })
        .finally(() => setLoadingDepts(false));
    }
  }, [formData.programCode, departments.length]);

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

  const handleEmailBlur = async () => {
    const email = formData.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return;
    }
    try {
      await assertRegistrationEmailAvailable(email);
      setFormErrors((prev) => ({ ...prev, email: "" }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormErrors((prev) => ({ ...prev, email: "This email is already registered." }));
      }
    }
  };

  const handlePhoneBlur = async () => {
    const phone = formData.mobileNumber.trim();
    if (!phone || phone.length < 8) {
      return;
    }
    try {
      await assertRegistrationPhoneAvailable(phone);
      setFormErrors((prev) => ({ ...prev, mobileNumber: "" }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormErrors((prev) => ({ ...prev, mobileNumber: "This mobile number is already registered." }));
      }
    }
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

    // Demographic Validation
    if (!formData.programCode) {
      errors.programCode = "Required";
    } else {
      if (formData.programCode === "SCHOOL_STUDENT") {
        if (!formData.studentBoard) errors.studentBoard = "Required";
        if (!formData.schoolLevel) errors.schoolLevel = "Required";
        if (formData.schoolLevel === "HSC") {
          if (!formData.schoolStream) errors.schoolStream = "Required";
          if (!formData.currentYear) errors.currentYear = "Required";
        }
      } else if (formData.programCode === "COLLEGE_STUDENT") {
        if (!formData.departmentDegreeId) errors.departmentDegreeId = "Required";
        if (!formData.currentYear) errors.currentYear = "Required";
      } else if (formData.programCode === "EMPLOYEE") {
        if (!formData.currentRole?.trim()) errors.currentRole = "Required";
        if (!formData.roleDescription?.trim()) errors.roleDescription = "Required";
      }
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
      const message = err.message || "Failed to create registration.";
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
    "w-full h-12 bg-brand-light-secondary dark:bg-brand-dark-tertiary border border-brand-light-tertiary dark:border-brand-dark-tertiary px-5 text-sm font-normal text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 outline-none transition-all focus:border-brand-green focus:ring-2 focus:ring-brand-green/20";

  const baseLabelClasses = "block text-xs font-semibold tracking-wider text-black dark:text-white ml-1";
  const baseSectionTitleClasses = "text-xs font-semibold tracking-wider text-brand-green mb-6 block";
  const toggleWrapperClasses = "flex w-full h-12 bg-brand-light-tertiary dark:bg-brand-dark-tertiary rounded-full p-1 border border-brand-light-tertiary dark:border-brand-dark-tertiary";
  const toggleButtonBase = "flex-1 text-[10px] md:text-xs font-semibold rounded-full transition-all duration-300 cursor-pointer";
  const activeToggleClasses = "bg-brand-green text-white";
  const inactiveToggleClasses = "text-black dark:text-white hover:text-brand-green";
  const isGroupPricingManaged = !!formData.groupCode?.trim();

  return (
    <div className="w-full font-sans animate-fade-in pb-12">


      {/* Main Form Card - full container width (w-full) matching the registration table */}
      <div 
        style={{ backgroundColor: "var(--admin-card-solid, #ffffff)" }}
        className="w-full border border-gray-200 dark:border-brand-dark-tertiary rounded-3xl p-6 sm:p-10 shadow-sm dark:shadow-xl transition-colors duration-300 relative"
      >
        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Basic Information Section */}
        <div className="mb-8">
          <h2 className={baseSectionTitleClasses}>Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className={baseLabelClasses}>Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                placeholder="Enter full name"
                style={{ borderRadius: "9999px" }}
                className={`${baseInputClasses} ${formErrors.fullName ? "border-red-400 ring-1 ring-red-200" : ""}`}
              />
              {formErrors.fullName && <p className="text-red-500 text-xs ml-1 mt-1">{formErrors.fullName}</p>}
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label className={baseLabelClasses}>Gender <span className="text-red-500">*</span></label>
              <div className={toggleWrapperClasses} style={{ borderRadius: "9999px" }}>
                {["MALE", "FEMALE", "OTHER"].map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => handleInputChange("gender", gender)}
                    style={{ borderRadius: "9999px" }}
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
                onBlur={handleEmailBlur}
                placeholder="name@example.com"
                style={{ borderRadius: "9999px" }}
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
              onBlur={handlePhoneBlur}
            />

            {/* Password input + Generate Password button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={baseLabelClasses}>Password <span className="text-red-500">*</span></label>
                <span
                  onClick={generatePassword}
                  className="text-xs font-semibold tracking-wider cursor-pointer text-brand-green hover:underline ml-1 select-none"
                >
                  Generate Password
                </span>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Min 8 characters"
                  style={{ borderRadius: "9999px" }}
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

            {/* Group Name input */}
            <div className="space-y-1.5">
              <label className={baseLabelClasses}>Group Name</label>
              <input
                type="text"
                value={formData.groupCode || ""}
                onChange={(e) => handleInputChange("groupCode", e.target.value)}
                placeholder="Enter the Group Name"
                style={{ borderRadius: "9999px" }}
                className={`${baseInputClasses} placeholder:text-xs placeholder:opacity-50`}
              />
            </div>

            {/* Send Email Notification Toggle */}
            <div className="space-y-1.5">
              <label className={baseLabelClasses}>Send Email Notification <span className="text-red-500">*</span></label>
              <div className={toggleWrapperClasses} style={{ borderRadius: "9999px" }}>
                <button
                  type="button"
                  onClick={() => handleInputChange("sendEmail", true)}
                  style={{ borderRadius: "9999px" }}
                  className={`${toggleButtonBase} ${formData.sendEmail !== false ? activeToggleClasses : inactiveToggleClasses}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange("sendEmail", false)}
                  style={{ borderRadius: "9999px" }}
                  className={`${toggleButtonBase} ${formData.sendEmail === false ? activeToggleClasses : inactiveToggleClasses}`}
                >
                  No
                </button>
              </div>
            </div>

            {/* Pricing Policy Toggle */}
            <div className="space-y-1.5">
              <label className={baseLabelClasses}>Pricing Policy</label>
              <div
                className={`${toggleWrapperClasses} ${isGroupPricingManaged ? "opacity-60" : ""}`}
                style={{ borderRadius: "9999px" }}
              >
                <button
                  type="button"
                  disabled={isGroupPricingManaged}
                  onClick={() => handleInputChange("pricingPolicy", "free")}
                  style={{ borderRadius: "9999px" }}
                  className={`${toggleButtonBase} ${formData.pricingPolicy !== "pay" ? activeToggleClasses : inactiveToggleClasses} ${isGroupPricingManaged ? "cursor-not-allowed" : ""}`}
                >
                  Free
                </button>
                <button
                  type="button"
                  disabled={isGroupPricingManaged}
                  onClick={() => handleInputChange("pricingPolicy", "pay")}
                  style={{ borderRadius: "9999px" }}
                  className={`${toggleButtonBase} ${formData.pricingPolicy === "pay" ? activeToggleClasses : inactiveToggleClasses} ${isGroupPricingManaged ? "cursor-not-allowed" : ""}`}
                >
                  Pay
                </button>
              </div>
              <p className="text-[11px] text-black/60 dark:text-white/50 ml-1">
                {isGroupPricingManaged
                  ? "Disabled because this user belongs to a group. Pricing is controlled by that group's settings."
                  : "Applied only to standalone users who are not attached to a group."}
              </p>
            </div>

          </div>
        </div>

        {/* Designation & Demographic Information Section */}
        <div className="mb-8 border-t border-gray-100 dark:border-white/5 pt-6">
          <h2 className={baseSectionTitleClasses}>Demographic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Designation Selector */}
            <div className="lg:col-span-3">
              <CustomSelect
                label="Designation"
                required
                options={PROGRAM_OPTIONS}
                value={formData.programCode || ""}
                onChange={(val) => {
                  handleInputChange("programCode", val);
                  // Reset conditional fields
                  handleInputChange("schoolLevel", "");
                  handleInputChange("schoolStream", "");
                  handleInputChange("studentBoard", "");
                  handleInputChange("departmentDegreeId", "");
                  handleInputChange("currentYear", "");
                  handleInputChange("currentRole", "");
                  handleInputChange("roleDescription", "");
                }}
                error={formErrors.programCode}
                placeholder="Select current status"
              />
            </div>

          </div>

          {/* Conditional Sections */}
          {formData.programCode === "SCHOOL_STUDENT" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 animate-in fade-in slide-in-from-top-1 duration-300">
              <CustomSelect
                label="Board"
                required
                options={BOARD_OPTIONS}
                value={formData.studentBoard || ""}
                onChange={(val) => {
                  handleInputChange("studentBoard", val);
                  handleInputChange("schoolLevel", "");
                }}
                error={formErrors.studentBoard}
                placeholder="Select Board"
              />
              <CustomSelect
                label="School Level"
                required
                options={
                  formData.studentBoard === "IGCSE" 
                    ? SCHOOL_LEVELS.filter(l => l.value === "GCSE")
                    : SCHOOL_LEVELS.filter(l => l.value === "SSLC" || l.value === "HSC")
                }
                value={formData.schoolLevel || ""}
                onChange={(val) => handleInputChange("schoolLevel", val)}
                error={formErrors.schoolLevel}
                placeholder="Select Level"
                disabled={!formData.studentBoard}
              />
              {formData.schoolLevel === "HSC" && (
                <>
                  <CustomSelect
                    label="Stream"
                    required
                    options={SCHOOL_STREAMS}
                    value={formData.schoolStream || ""}
                    onChange={(val) => handleInputChange("schoolStream", val)}
                    error={formErrors.schoolStream}
                    placeholder="Select Stream"
                  />
                  <div className="space-y-1.5 lg:col-span-3">
                    <label className={baseLabelClasses}>Current Year (1-2) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      min="1"
                      max="2"
                      value={formData.currentYear || ""}
                      onChange={(e) => handleInputChange("currentYear", e.target.value)}
                      placeholder="Enter Year"
                      style={{ borderRadius: "9999px" }}
                      className={`${baseInputClasses} ${formErrors.currentYear ? "border-red-400 ring-1 ring-red-200" : ""}`}
                    />
                    {formErrors.currentYear && <p className="text-red-500 text-xs ml-1 mt-1">{formErrors.currentYear}</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {formData.programCode === "COLLEGE_STUDENT" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="lg:col-span-2">
                <CustomSelect
                  label="Department"
                  required
                  options={departments}
                  value={formData.departmentDegreeId || ""}
                  onChange={(val) => handleInputChange("departmentDegreeId", val)}
                  error={formErrors.departmentDegreeId}
                  placeholder={loadingDepts ? "Loading..." : "Select Department"}
                  disabled={loadingDepts}
                />
              </div>
              <div className="space-y-1.5">
                <label className={baseLabelClasses}>Current Year (1-6) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={formData.currentYear || ""}
                  onChange={(e) => handleInputChange("currentYear", e.target.value)}
                  placeholder="Enter Year"
                  style={{ borderRadius: "9999px" }}
                  className={`${baseInputClasses} ${formErrors.currentYear ? "border-red-400 ring-1 ring-red-200" : ""}`}
                />
                {formErrors.currentYear && <p className="text-red-500 text-xs ml-1 mt-1">{formErrors.currentYear}</p>}
              </div>
            </div>
          )}

          {formData.programCode === "EMPLOYEE" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="space-y-1.5 lg:col-span-3">
                <label className={baseLabelClasses}>Current Role <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.currentRole || ""}
                  onChange={(e) => handleInputChange("currentRole", e.target.value)}
                  placeholder="e.g. Software Engineer"
                  style={{ borderRadius: "9999px" }}
                  className={`${baseInputClasses} ${formErrors.currentRole ? "border-red-400 ring-1 ring-red-200" : ""}`}
                />
                {formErrors.currentRole && <p className="text-red-500 text-xs ml-1 mt-1">{formErrors.currentRole}</p>}
              </div>
              <div className="space-y-1.5 lg:col-span-3">
                <label className={baseLabelClasses}>Role Description <span className="text-red-500">*</span></label>
                <textarea
                  value={formData.roleDescription || ""}
                  onChange={(e) => handleInputChange("roleDescription", e.target.value)}
                  placeholder="Briefly describe your responsibilities"
                  style={{ borderRadius: "24px" }}
                  className="w-full min-h-[100px] bg-brand-light-secondary dark:bg-brand-dark-tertiary border border-brand-light-tertiary dark:border-brand-dark-tertiary px-5 py-3 text-sm font-normal text-black dark:text-white outline-none transition-all focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 resize-none"
                />
                {formErrors.roleDescription && <p className="text-red-500 text-xs ml-1 mt-1">{formErrors.roleDescription}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 mt-8">
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{ borderRadius: "9999px" }}
            className="w-full sm:w-auto px-10 h-12 border border-gray-300 dark:border-white/10 text-black dark:text-white font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{ borderRadius: "9999px" }}
            className="w-full sm:w-auto px-12 h-12 bg-brand-green hover:bg-brand-green/90 text-white font-semibold transition-all active:scale-[0.98] disabled:opacity-50 text-sm flex justify-center items-center cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Processing...
              </>
            ) : (
              "Register"
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddRegistrationForm;
