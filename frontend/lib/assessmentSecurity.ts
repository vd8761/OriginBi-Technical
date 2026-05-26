/**
 * Assessment Security Utilities
 * Provides centralized security validation for all assessment types
 */

export type AssessmentMode = 'trial' | 'main';
export type AssessmentModule = 'aptitude' | 'mnc' | 'role' | 'grammar' | 'coding';

interface EligibilityResult {
  canStart: boolean;
  reason?: string;
  currentCount: number;
  limit: number;
}

interface CertificateValidationResult {
  valid: boolean;
  result?: any;
}

/**
 * Validates and sanitizes assessment mode parameter
 */
export function sanitizeMode(mode: string | null | undefined): AssessmentMode {
  const validModes: AssessmentMode[] = ['trial', 'main'];
  return validModes.includes(mode as AssessmentMode) ? (mode as AssessmentMode) : 'main';
}

/**
 * Maps assessment module to assessment code
 */
export function getAssessmentCode(module: AssessmentModule): string {
  const codeMap: Record<AssessmentModule, string> = {
    aptitude: 'TECH_APT_001',
    mnc: 'TECH_MNC_001',
    role: 'TECH_ROLE_001',
    grammar: 'TECH_COMM_001',
    coding: 'TECH_CODING_001'
  };
  return codeMap[module] || 'TECH_APT_001';
}

/**
 * Gets user ID from various localStorage sources
 */
export function getUserId(): number {
  let userId: number | null = null;
  
  try {
    const profileRaw = localStorage.getItem("originbi:user-profile");
    if (profileRaw) {
      const p = JSON.parse(profileRaw);
      if (p?.id) userId = Number(p.id);
    }
  } catch {}
  
  if (!userId) {
    try {
      const stored = localStorage.getItem("userId") || localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        const id = typeof parsed === "object" ? parsed?.id : parseInt(stored);
        if (id) userId = Number(id);
      }
    } catch {}
  }
  
  return userId ?? 1;
}

/**
 * Validates if user can start a new attempt for given assessment and mode
 */
export async function validateAttemptEligibility(
  module: AssessmentModule,
  mode: AssessmentMode,
  apiBase: string = ""
): Promise<EligibilityResult> {
  try {
    const userId = getUserId();
    const assessmentCode = getAssessmentCode(module);
    
    const response = await fetch(`${apiBase}/api/assessment/validate-eligibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, assessmentCode, mode }),
    });
    
    if (!response.ok) {
      // If it's a 404, the endpoint doesn't exist yet - allow for backward compatibility
      if (response.status === 404) {
        console.warn('Eligibility validation endpoint not available - continuing without validation');
        return { canStart: true, currentCount: 0, limit: 999 };
      }
      
      const errorText = await response.text().catch(() => "Attempt limit exceeded");
      return { canStart: false, reason: errorText, currentCount: 0, limit: 0 };
    }
    
    return await response.json();
  } catch (error: any) {
    // If it's a network error, allow for backward compatibility
    if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
      console.warn('Eligibility validation unavailable - continuing without validation:', error.message);
      return { canStart: true, currentCount: 0, limit: 999 };
    }
    
    // For other errors, deny access
    return { canStart: false, reason: error.message, currentCount: 0, limit: 0 };
  }
}

/**
 * Validates if user can generate certificate for given assessment
 */
export async function validateCertificateEligibility(
  examId: string,
  mode: AssessmentMode = 'main',
  apiBase: string = ""
): Promise<CertificateValidationResult> {
  try {
    const userId = getUserId();
    
    const response = await fetch(`${apiBase}/api/assessment/validate-certificate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, examId, mode }),
    });
    
    if (!response.ok) {
      // If it's a 404, the endpoint doesn't exist yet - allow for backward compatibility
      if (response.status === 404) {
        console.warn('Certificate validation endpoint not available - continuing without validation');
        return { valid: true };
      }
      
      return { valid: false };
    }
    
    return await response.json();
  } catch (error: any) {
    // If it's a network error, allow for backward compatibility
    if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
      console.warn('Certificate validation unavailable - continuing without validation:', error.message);
      return { valid: true };
    }
    
    return { valid: false };
  }
}

/**
 * Prevents navigation loops by checking current path
 */
export function preventNavigationLoop(targetPath: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const currentPath = window.location.pathname;
  if (currentPath === targetPath) {
    console.warn('Already on target assessment page, preventing loop');
    return true;
  }
  
  return false;
}

/**
 * Comprehensive security check before starting assessment
 */
export async function securityCheckBeforeStart(
  module: AssessmentModule,
  mode: string | null | undefined,
  apiBase: string = ""
): Promise<{ canProceed: boolean; sanitizedMode: AssessmentMode; error?: string }> {
  // Sanitize mode parameter
  const sanitizedMode = sanitizeMode(mode);
  
  // Check attempt eligibility
  const eligibility = await validateAttemptEligibility(module, sanitizedMode, apiBase);
  
  if (!eligibility.canStart) {
    return {
      canProceed: false,
      sanitizedMode,
      error: eligibility.reason || 'Cannot start assessment'
    };
  }
  
  return { canProceed: true, sanitizedMode };
}