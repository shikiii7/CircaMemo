export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
  role: "user" | "admin";
  status: "active" | "disabled";
  createdAt: string | null;
  lastLoginAt: string | null;
};

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: FieldErrors };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_DISPLAY_NAME_LENGTH = 32;

export function normalizeEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export type RegistrationInput = {
  email: string;
  displayName: string;
  password: string;
};

/** 注册表单校验：邮箱格式、昵称长度、密码长度。 */
export function validateRegistration(
  payload: Record<string, unknown>,
): ValidationResult<RegistrationInput> {
  const errors: FieldErrors = {};
  const email = normalizeEmail(payload.email);
  const displayName =
    typeof payload.displayName === "string" ? payload.displayName.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!email) {
    errors.email = "请填写邮箱";
  } else if (email.length > 190 || !EMAIL_PATTERN.test(email)) {
    errors.email = "邮箱格式不正确";
  }

  if (!displayName) {
    errors.displayName = "请填写昵称";
  } else if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    errors.displayName = `昵称不能超过 ${MAX_DISPLAY_NAME_LENGTH} 个字符`;
  }

  if (!password) {
    errors.password = "请填写密码";
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `密码至少 ${MIN_PASSWORD_LENGTH} 位`;
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    errors.password = `密码不能超过 ${MAX_PASSWORD_LENGTH} 位`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { email, displayName, password } };
}

export type LoginInput = { email: string; password: string };

export function validateLogin(
  payload: Record<string, unknown>,
): ValidationResult<LoginInput> {
  const errors: FieldErrors = {};
  const email = normalizeEmail(payload.email);
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!email) errors.email = "请填写邮箱";
  if (!password) errors.password = "请填写密码";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { email, password } };
}

export const CONTENT_BODY_MAX_LENGTH = 2000;
export const CONTENT_TITLE_MAX_LENGTH = 80;

export type ContentInput = {
  heritagePid: string;
  heritageName: string;
  title: string | null;
  body: string;
};

export function validateContentInput(
  payload: Record<string, unknown>,
): ValidationResult<ContentInput> {
  const errors: FieldErrors = {};
  const heritagePid =
    typeof payload.heritagePid === "string" ? payload.heritagePid.trim() : "";
  const heritageName =
    typeof payload.heritageName === "string" ? payload.heritageName.trim() : "";
  const titleRaw = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";

  if (!heritagePid) errors.heritagePid = "请选择文保点";
  if (!heritageName) errors.heritageName = "文保点名称为空，请重新选择";

  if (!body) {
    errors.body = "请填写文字内容";
  } else if (body.length > CONTENT_BODY_MAX_LENGTH) {
    errors.body = `文字内容不能超过 ${CONTENT_BODY_MAX_LENGTH} 字`;
  }

  if (titleRaw.length > CONTENT_TITLE_MAX_LENGTH) {
    errors.title = `标题不能超过 ${CONTENT_TITLE_MAX_LENGTH} 字`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      heritagePid,
      heritageName,
      title: titleRaw || null,
      body,
    },
  };
}
