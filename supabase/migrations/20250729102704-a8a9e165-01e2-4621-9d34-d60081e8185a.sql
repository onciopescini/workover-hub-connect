-- Enable password protection features
UPDATE auth.config 
SET 
  password_min_length = 8,
  password_require_letters = true,
  password_require_numbers = true,
  password_require_symbols = false,
  password_require_upper = true,
  password_require_lower = true,
  security_check_leaked_passwords = true
WHERE true;