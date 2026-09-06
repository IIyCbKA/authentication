from accounts.constants import VERIFICATION_CODE_LENGTH as VERIFICATION_CODE_LENGTH

AUTH_SCOPE_CLAIM = 'auth_scope'
AUTH_SCOPE_FULL = 'full'
AUTH_SCOPE_EMAIL_VERIFICATION = 'email_verification'
AUTH_VERSION_CLAIM = 'auth_version'

RESET_PASSWORD_MAIL_SUBJECT = 'Password reset request'
RESET_PASSWORD_MAIL_BODY = '''
Hi,

You requested a password reset for your <App Name> account.

The link was created at {created_at} and is valid until {expires_at} {timezone}.
{link}

If you didn't request this, just ignore this email.
If the link doesn't work, request a new password reset from the app.

Thanks,
The <App Name> Team
'''

VERIFICATION_MAIL_SUBJECT = 'Your email verification code for <App Name>'
VERIFICATION_MAIL_BODY = '''
Hi,

To verify your email, please use the following code: {code}
The code was created at {created_at} and is valid until {expires_at} {timezone}.

If you did not request this verification, please disregard this email.

Thanks,
The <App Name> Team
'''

NEW_DEVICE_LOGIN_SUBJECT = 'New sign-in to your <App Name> account'
NEW_DEVICE_LOGIN_BODY = '''
Hi,

We detected a sign-in to your <App Name> account from a new device at
{observed_at} {timezone}:

Platform: {platform}
IP address: {ip}

If this was you, no further action is required.

If you do not recognize this activity, change your password immediately.

Thanks,
The <App Name> Team
'''
