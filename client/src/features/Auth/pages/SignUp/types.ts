/*
--------------FormData type--------------
username                 - username input line value
password                 - password input line value
passwordConfirmation     - passwordConfirmation input line value
email                    - email input line value
*/
export type FormData = {
  username: string;
  password: string;
  passwordConfirmation: string;
  email: string;
};

/*
--------------FormField type--------------
*/
export type FormField =
  "username" | "password" | "passwordConfirmation" | "email";

/*
--------------FieldConfig type--------------
*/
export type FieldConfig = {
  placeholder: string;
  name: FormField;
};

/*
--------------FieldConfigMap type--------------
*/
export type FieldConfigMap = Record<FormField, FieldConfig>;

/*
--------------ErrorsMap type--------------
*/
export type ErrorsMap = {
  username?: string;
  password?: string;
  passwordConfirmation?: string;
  email?: string;
};
