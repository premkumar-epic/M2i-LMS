// backend/src/validators/auth.validators.ts
// Joi schemas for all auth endpoints.
// Used via validate() middleware.

import Joi from "joi";

const passwordRules = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .message(
    "Password must be at least 8 characters and contain " +
      "uppercase, lowercase, and a number"
  );

export const registerSchema = Joi.object({
  email: Joi.string().email().max(255).required().lowercase().trim(),
  password: passwordRules.required(),
  password_confirmation: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({ "any.only": "Passwords do not match" }),
  full_name: Joi.string().min(2).max(255).required().trim(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().required(),
});

export const updateProfileSchema = Joi.object({
  full_name: Joi.string().min(2).max(255).trim(),
  avatar_url: Joi.string().uri().max(2048).allow(null, ""),
}).min(1);

export const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: passwordRules.required(),
  new_password_confirmation: Joi.string()
    .valid(Joi.ref("new_password"))
    .required()
    .messages({ "any.only": "New passwords do not match" }),
});
