/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useUser } from "@/context/user";
import config from "@/config";

const ButtonSignin = ({
  text = "Get started",
  extraStyle,
}: {
  text?: string;
  extraStyle?: string;
}) => {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <button className={`btn flex items-center justify-center gap-2 ${extraStyle ? extraStyle : ""}`} disabled>
        Loading...
      </button>
    );
  }

  if (user) {
    return (
      <Link
        href={config.auth.callbackUrl}
        className={`btn flex items-center justify-center gap-2 ${extraStyle ? extraStyle : ""}`}
      >
        {user?.user_metadata?.avatar_url ? (
          <img
            src={user?.user_metadata?.avatar_url}
            alt={user?.user_metadata?.name || "Account"}
            className="w-6 h-6 rounded-full shrink-0"
            referrerPolicy="no-referrer"
            width={24}
            height={24}
          />
        ) : (
          <span className="w-6 h-6 bg-base-300 flex justify-center items-center rounded-full shrink-0">
            {user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0)}
          </span>
        )}
        {user?.user_metadata?.name || user?.email || "Account"}
      </Link>
    );
  }

  return (
    <Link
      className={`btn ${extraStyle ? extraStyle : ""}`}
      href={config.auth.loginUrl}
    >
      {text}
    </Link>
  );
};

export default ButtonSignin;
