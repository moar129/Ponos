// src/types/auth/authType.ts

// US-68: argumenter til authApi's resetPassword-mutation. Navnefelterne er
// prototypens eneste "bevis" for, at det er den rigtige person - der sendes
// ingen bekræftelse på mail. Se specen i docs/studerende1-plan.md.
export interface ResetPasswordInput {
    email: string
    firstName: string
    lastName: string
    password: string
}

// US-69: argumenter til changePassword. Emailen tages fra den aktive
// session, så brugeren ikke skal taste den igen.
export interface ChangePasswordInput {
    currentPassword: string
    newPassword: string
}
