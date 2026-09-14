import { Github, Google, Yandex, XIcon } from "@/assets/icons";
import type { ButtonElement } from "./types";

export const ELEMENTS_LIST: ButtonElement[] = [
  {
    icon: Github,
    provider: "github",
  },
  {
    icon: Google,
    provider: "google",
  },
  {
    icon: Yandex,
    provider: "yandex",
  },
  {
    icon: XIcon,
    provider: "x",
  },
];
