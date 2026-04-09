export function updateUserState(user) {
  if (!user.isVerified) {
    user.signupStage = "email_pending";
    user.accountStatus = "pending";
    return;
  }

  if (!user.recovery?.enabled) {
    user.signupStage = "recovery_pending";
    user.accountStatus = "active";
    return;
  }

  if (!user.twoFactorEnabled) {
    user.signupStage = "mfa_pending";
    user.accountStatus = "active";
    return;
  }

  user.signupStage = "complete";
  user.accountStatus = "active";
}