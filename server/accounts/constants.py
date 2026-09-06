#####################
#      CONFIGS      #
#####################
PASSWORD_MIN_LENGTH = 8
USERNAME_MAX_LENGTH = 150
PASSWORD_PATTERN = (
  r'^(?=.*[A-Za-z])'
  r'(?=.*\d)'
  rf'[A-Za-z\d]{{{PASSWORD_MIN_LENGTH},}}'
  r'$'
)
VERIFICATION_CODE_LENGTH = 6


######################
#       ERRORS       #
######################
PASSWORD_VALIDATE_ERROR = (
  'Password must be at least {min_length} characters long, '
  'contain at least one letter and one digit, '
  'and consist only of ASCII letters and digits'
).format(min_length=PASSWORD_MIN_LENGTH)
USERNAME_CHANGE_LIMIT_ERROR = (
  'Username change limit has been reached. '
  'The next change will be available on {human}.'
)
USERNAME_ALREADY_TAKEN_ERROR = 'This username already taken'
