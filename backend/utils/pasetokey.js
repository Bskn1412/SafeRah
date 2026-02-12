// backend/utils/pasetokey.js
import 'dotenv/config'; // ensures process.env is loaded
export const pasetokey = process.env.PASETO_SECRET;

if (!pasetokey) {
  console.warn(
    "⚠️  Warning: PASETO_SECRET is missing! Your app will not be secure."
  );
}
else{
  console.log("PASETO_SECRET loaded successfully.", `Length: ${pasetokey.length} characters.`);
}

// Export the secret (can be undefined, so caller should handle it)

// // Optional: helper function to ensure secret exists when needed
// export function getPasetoSecret() {
//   if (!PASETO_SECRET) {
//     throw new Error(
//       "PASETO_SECRET is missing! Set it in your .env or environment variables."
//     );
//   }
//   return PASETO_SECRET;
// }
// export const pasetoKey = getPasetoSecret();