// backend/middleware/authMiddleware.js

import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  let token = null;

  // 1. Try Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader) {
  console.log(`[authMiddleware] Route ${req.method} ${req.originalUrl} - Full Authorization header:`, authHeader);

    // Split on any whitespace, ignore case
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0].toLowerCase() === "bearer") {
      const headerToken = parts[1].trim();
      if (headerToken && headerToken !== "undefined" && headerToken.length > 20) {
        token = headerToken;
        console.log("Using Bearer token from header:", token.substring(0, 30) + "...");
      } else {
        console.log("Rejected Bearer token (empty, undefined, or too short)");
      }
    } else {
      console.log("Invalid Authorization format");
    }
  }

  // 2. Fallback to cookie if no valid header token
  if (!token && req.cookies?.token) {
    token = req.cookies.token.trim();
    console.log("Using token from cookie:", token.substring(0, 30) + "...");
  }

  if (!token) {
    console.log("No valid token found");
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token decoded successfully:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    console.error("Bad token was:", token.substring(0, 30) + "...");
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};







// export const authMiddleware = (req, res, next) => {
//   const token = req.cookies.token;
//   if (!token) return res.status(401).json({ message: "Not authenticated" });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (err) {
//     return res.status(401).json({ message: "Invalid token" });
//   }
// };









// backend/middleware/authMiddleware.js

// import jwt from "jsonwebtoken";

// export const authMiddleware = (req, res, next) => {
//   let token = null;

//   // 1. Check for Authorization header
//   const authHeader = req.headers.authorization;
//   if (authHeader && authHeader.startsWith("Bearer ")) {
//     const headerToken = authHeader.split(" ")[1].trim(); // Trim any extra spaces
//     if (headerToken && headerToken !== "undefined" && headerToken.length > 0) {
//       token = headerToken;
//       console.log("Using Bearer token from header:", token.substring(0, 30) + "...");
//     } else {
//       console.log("Invalid Bearer token — empty or 'undefined'");
//     }
//   }

//   // 2. Fallback to cookie if no valid header token
//   if (!token && req.cookies?.token) {
//     token = req.cookies.token.trim();
//     console.log("Using token from cookie:", token.substring(0, 30) + "...");
//   }

//   if (!token || token === "undefined" || token.length < 10) { // Extra safety for malformed token
//     console.log("No valid token found");
//     return res.status(401).json({ message: "Not authenticated — no valid token" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     console.log("Token decoded successfully:", decoded);
//     req.user = decoded;
//     next();
//   } catch (err) {
//     console.error("JWT verification failed:", err.message);
//     console.error("Bad token was:", token.substring(0, 30) + "...");
//     return res.status(401).json({ message: "Invalid or expired token" });
//   }
// };