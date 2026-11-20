import { createRemoteJWKSet, jwtVerify } from "jose";

let JWKS;

function getJWKS() {
  const authBaseURL = process.env.BETTER_AUTH_BASE_URL?.replace(/\/+$/, "");

  if (!authBaseURL) {
    throw new Error("BETTER_AUTH_BASE_URL is missing");
  }

  if (!JWKS) {
    JWKS = createRemoteJWKSet(new URL(`${authBaseURL}/api/auth/jwks`));
  }

  return { JWKS, authBaseURL };
}

// ==========================================
// JWT VERIFICATION
// ==========================================

export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { JWKS, authBaseURL } = getJWKS();

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: authBaseURL,
      audience: authBaseURL,
      algorithms: ["EdDSA"],
    });

    const { sub, email, role } = payload;

    if (
      typeof sub !== "string" ||
      typeof email !== "string" ||
      !["customer", "owner", "admin"].includes(role)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    req.user = {
      id: sub,
      email,
      role,
    };

    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
}

// ==========================================
// ROLE-BASED AUTHORIZATION
// ==========================================

const allowRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this resource",
      });
    }

    next();
  };
};

// Customer = Renter
export const verifyRenter = allowRole("customer");

export const verifyOwner = allowRole("owner");

export const verifyAdmin = allowRole("admin");
