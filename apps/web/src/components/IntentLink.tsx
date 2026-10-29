"use client";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * Link that never prefetches on render/viewport. It prefetches only on intent (hover, focus, touch),
 * so a page load no longer fires ~10 extra server renders for every menu link.
 */
export default function IntentLink(props: ComponentProps<typeof NextLink>) {
  const router = useRouter();
  const { href, onMouseEnter, onFocus, onTouchStart, ...rest } = props;
  const url = typeof href === "string" ? href : (href.pathname ?? "");
  const warm = () => {
    if (url.startsWith("/")) router.prefetch(url);
  };
  return (
    <NextLink
      {...rest}
      href={href}
      prefetch={false}
      onMouseEnter={(e) => {
        warm();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        warm();
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        warm();
        onTouchStart?.(e);
      }}
    />
  );
}
