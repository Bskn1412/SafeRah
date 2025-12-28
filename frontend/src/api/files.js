// src/api/files.js
import { api } from "../api";

export async function fetchUserFiles() {
  const res = await api.get("/files/list");
  return res.data.files || [];
}
