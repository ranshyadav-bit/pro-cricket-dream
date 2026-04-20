import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Pro Cricket Career 26 — Career Mode Cricket Game" },
      {
        name: "description",
        content:
          "An interactive single-player cricket career game. Choose your shot ball-by-ball, train, and rise from club to international.",
      },
      { name: "author", content: "Pro Cricket Career 26" },
      { property: "og:title", content: "Pro Cricket Career 26 — Career Mode Cricket Game" },
      {
        property: "og:description",
        content:
          "Bat, bowl, and become a legend. A choose-your-shot cricket career game.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Pro Cricket Career 26 — Career Mode Cricket Game" },
      { name: "description", content: "Cricket!" },
      { property: "og:description", content: "Cricket!" },
      { name: "twitter:description", content: "Cricket!" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4b62dd92-86eb-4d9f-bc35-c089262b073a/id-preview-c9d3d0d8--6bab2c7a-226f-4246-9f51-82a0b8dc1dce.lovable.app-1776680636378.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4b62dd92-86eb-4d9f-bc35-c089262b073a/id-preview-c9d3d0d8--6bab2c7a-226f-4246-9f51-82a0b8dc1dce.lovable.app-1776680636378.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
