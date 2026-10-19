import { LinkPreset, type NavBarConfig, type NavBarSearchConfig, NavBarSearchMethod } from "../types/config";
import { otherConfig } from "./otherConfig";

export const navBarConfig: NavBarConfig = {
  links: [LinkPreset.Home, LinkPreset.Archive, LinkPreset.About, ...(otherConfig.enabled && otherConfig.stylophone ? [{ name: "喵喵屋", url: "/other/" }] : [])],
};
export const navBarSearchConfig: NavBarSearchConfig = {
  method: NavBarSearchMethod.PageFind,
};
