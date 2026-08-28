const NAME_KEY = "ivry_photos_uploader_name";
const DEVICE_KEY = "ivry_photos_device_id";
const ADMIN_KEY = "ivry_photos_admin_password";

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getUploaderName() {
  return localStorage.getItem(NAME_KEY) || "";
}

export function setUploaderName(name) {
  localStorage.setItem(NAME_KEY, name.trim());
}

export function getAdminPassword() {
  return localStorage.getItem(ADMIN_KEY) || "";
}

export function setAdminPassword(password) {
  localStorage.setItem(ADMIN_KEY, password);
}

export function clearAdminPassword() {
  localStorage.removeItem(ADMIN_KEY);
}
