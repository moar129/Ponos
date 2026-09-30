// src/utils/validatePassword.ts

export const MIN_PASSWORD_LENGTH = 6

/**
 * Den fælles regel for en ny adgangskode (opret konto, glemt og skift
 * adgangskode). Returnerer auth-nøglen på problemet, eller null.
 */
export function passwordProblem(
    password: string,
    confirmPassword: string,
): 'validation.passwordTooShort' | 'validation.passwordsDoNotMatch' | null {
    if (password.length < MIN_PASSWORD_LENGTH) return 'validation.passwordTooShort'
    if (password !== confirmPassword) return 'validation.passwordsDoNotMatch'
    return null
}
