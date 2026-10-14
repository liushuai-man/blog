import { LinkPreset, type NavBarConfig, type NavBarSearchConfig, NavBarSearchMethod } from "../types/config";

export const navBarConfig: NavBarConfig = {
  links: [LinkPreset.Home, LinkPreset.Archive, LinkPreset.About],
};
export const navBarSearchConfig: NavBarSearchConfig = {
  method: NavBarSearchMethod.PageFind,
};
