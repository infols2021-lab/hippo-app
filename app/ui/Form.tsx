"use client";

import React from "react";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="label">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={"input " + (props.className ?? "")} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={"select " + (props.className ?? "")} />;
}

export function Button({
  variant = "ghost",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "primary";
}) {
  const cls = variant === "primary" ? "btn btnPrimary" : "btn";
  return <button {...props} className={cls + " " + (props.className ?? "")} />;
}

export function Alert({
  type,
  children,
}: {
  type: "ok" | "error";
  children: React.ReactNode;
}) {
  const cls = type === "ok" ? "alert alertOk" : "alert alertErr";
  return <div className={cls}>{children}</div>;
}
