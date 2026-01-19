import React from "react";

export function Page({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="container">
      <div className="card">
        <div className="header">
          <div>
            <h1 className="h1">{title}</h1>
            {subtitle && <p className="sub">{subtitle}</p>}
          </div>
          {right}
        </div>
        {children}
      </div>
    </main>
  );
}
