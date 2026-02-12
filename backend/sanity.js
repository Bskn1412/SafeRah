// backend/sanityClient.js
import { createClient } from "@sanity/client";
import dotenv from "dotenv";
dotenv.config();

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_WRITE_TOKEN, // 🔐 backend only
  useCdn: false,
});

export default sanity;