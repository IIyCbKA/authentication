import React, { ButtonHTMLAttributes } from "react";
import type { OAuthProvider } from "@/domain/auth/types";

/*
--------------Provider type--------------
*/
export type Provider = OAuthProvider;

/*
--------------IconComponent type--------------
*/
export type IconComponent = React.FC<React.SVGProps<SVGSVGElement>>;

/*
--------------ButtonElement type--------------
provider    - oauth provider
icon        - button image
*/

export type ButtonElement = ButtonHTMLAttributes<HTMLButtonElement> & {
  provider: Provider;
  icon: IconComponent;
};
