import { jwtDecode } from "jwt-decode";
import { NextRequest, NextResponse } from "next/server";

const Middleware = (request: NextRequest) => {
  const redirect = () =>
    NextResponse.redirect(new URL("/authentication/sign-in", request.url));

  const token = request.cookies.get("@data-token");
  if (!token) return redirect();

  const verify = jwtDecode(token.value);

  if (verify.exp < Date.now() / 1000) return redirect();

  return NextResponse.next();
};

export const config = {
  matcher: "/dashboard/:path*",
};

export default Middleware;
