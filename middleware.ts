export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tasks/:path*",
    "/project/:path*",
    "/settings/:path*",
    "/history/:path*",
  ],
};
