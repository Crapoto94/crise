const NAME_KEY = "ivry_photos_uploader_name";
const DEVICE_KEY = "ivry_photos_device_id";

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
