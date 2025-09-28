import type { ReactNode } from "react";
import Providers from "./provider"; // client wrapper for Auth and Google Maps API

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
