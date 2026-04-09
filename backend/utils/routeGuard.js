export function getRedirectPath(user) {
  if (!user) return "/login";

  switch (user.signupStage) {
    case "email_pending":
      return "/verify-email";

    case "recovery_pending":
      return "/setup-recovery";

    case "mfa_pending":
      return "/authenticator";

    case "complete":
      return "/dashboard";

    default:
      return "/login";
  }
}