import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactCountryFlag from "react-country-flag";
import { ChevronDown } from 'lucide-react';
import { COUNTRY_CODES } from '../../lib/countryCodes';

interface MobileInputProps {
  countryCode: string;
  phoneNumber: string;
  onCountryChange: (code: string) => void;
  onPhoneChange: (number: string) => void;
  onOpenChange?: (isOpen: boolean) => void;
  error?: string;
  label?: string;
  required?: boolean;
}

const MobileInput: React.FC<MobileInputProps> = ({
  countryCode,
  phoneNumber,
  onCountryChange,
  onPhoneChange,
  onOpenChange,
  error,
  label,
  required,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Default to IN or first entry if provided code not found
  const selectedCountry =
    COUNTRY_CODES.find((c) => c.dial_code === countryCode) ||
    COUNTRY_CODES.find((c) => c.code === "IN") ||
    COUNTRY_CODES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onOpenChange]);

  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    } else {
      setSearchTerm(""); // Reset search on close
    }
  }, [isDropdownOpen]);

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    const max = selectedCountry.maxLength || 10;

    if (val.length <= max) {
      onPhoneChange(val);
    }
  };

  const toggleDropdown = () => {
    const next = !isDropdownOpen;
    setIsDropdownOpen(next);
    onOpenChange?.(next);
  };

  const filteredCountries = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return COUNTRY_CODES.filter(
      (country) =>
        country.name.toLowerCase().includes(lowerSearch) ||
        country.dial_code.includes(lowerSearch) ||
        country.code.toLowerCase().includes(lowerSearch)
    );
  }, [searchTerm]);

  const maxLen = selectedCountry.maxLength || 10;

  return (
    // Dynamic Z-index to float above nearby fields when open
    <div
      className={`space-y-2 w-full ${isDropdownOpen ? "relative z-50" : "relative z-0"
        }`}
    >
      {label && (
        <label className="text-xs text-black/70 dark:text-white font-semibold ml-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="flex gap-3 h-[50px]">
        {/* Country Dropdown */}
        <div className="relative w-[110px] shrink-0 h-full" ref={dropdownRef}>
          <button
            type="button"
            onClick={toggleDropdown}
            className="
              w-full h-full flex items-center justify-between
              bg-gray-50 dark:bg-white/10
              border border-transparent
              rounded-xl px-2.5 text-sm
              text-black dark:text-white font-semibold
              transition-all
              hover:border-brand-green/50 hover:bg-gray-100 dark:hover:bg-white/15
            "
          >
            <span className="flex items-center gap-2 truncate">
              <ReactCountryFlag
                countryCode={selectedCountry.code}
                svg
                style={{
                  width: "24px",
                  height: "16px",
                  borderRadius: "2px",
                  objectFit: "cover",
                }}
              />
              <span className="text-black/60 dark:text-white/70 font-normal text-xs">
                {selectedCountry.dial_code}
              </span>
            </span>

            <ChevronDown
              className={`w-3 h-3 text-gray-500 dark:text-gray-300 transition-transform shrink-0 ${isDropdownOpen ? "rotate-180" : ""
                }`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#2D312E] backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-60">
              {/* Search Bar */}
              <div className="p-2 border-b border-gray-100 dark:border-white/5 sticky top-0 bg-white dark:bg-[#2D312E]/80 backdrop-blur z-10">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="
                    w-full bg-gray-50 dark:bg-[#19211C]
                    text-black dark:text-white text-xs
                    rounded-lg px-3 py-2
                    focus:outline-none border border-transparent
                    focus:border-brand-green/50
                    placeholder-black/40 dark:placeholder-gray-500
                  "
                />
              </div>

              {/* Country List */}
              <div className="overflow-y-auto custom-scrollbar flex-1">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => (
                    <button
                      key={`${country.code}-${country.dial_code}`}
                      type="button"
                      onClick={() => {
                        onCountryChange(country.dial_code);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${countryCode === country.dial_code
                        ? "bg-brand-green/10 text-brand-green"
                        : "text-black dark:text-gray-200"
                        }`}
                    >
                      <img
                        src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                        srcSet={`https://flagcdn.com/w80/${country.code.toLowerCase()}.png 2x`}
                        width="20"
                        height="14"
                        alt={country.name}
                        className="rounded-[2px] object-cover w-5 h-3.5 shrink-0"
                      />
                      <span className="flex-1 font-medium truncate text-xs sm:text-sm">
                        {country.name}
                      </span>
                      <span className="text-xs opacity-70 whitespace-nowrap ml-auto">
                        {country.dial_code}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-gray-500">
                    No results found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone Input */}
        <div className="relative flex-1 h-full">
          <input
            type="text"
            value={phoneNumber}
            onChange={handlePhoneInput}
            placeholder={
              maxLen > 0 ? "0".repeat(maxLen) : "Mobile Number"
            }
            className={`
              w-full h-full
              bg-gray-50 dark:bg-white/10
              border border-transparent
              rounded-xl px-4 text-sm
              text-black dark:text-white
              placeholder-black/40 dark:placeholder-white/60
              focus:border-brand-green focus:outline-none
              transition-colors tracking-wide
              ${error ? "border-red-500/50" : ""}
            `}
          />
          {/* Character Count Indicator */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 dark:text-gray-500 pointer-events-none">
            {phoneNumber.length}/{maxLen}
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-400 ml-1">{error}</p>}
    </div>
  );
};

export default MobileInput;
