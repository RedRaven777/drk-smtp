export const fakeUser = {
  email: "flameraven.pro@gmail.com",
  password: "123456",
  totp: "123456",
};

export function isValidLogin(data: {
  email: string;
  password: string;
  totp: string;
}) {
  return (
    data.email === fakeUser.email &&
    data.password === fakeUser.password &&
    data.totp === fakeUser.totp
  );
}

export function isValidReset(data: {
  email: string;
  totp: string;
}) {
  return data.email === fakeUser.email && data.totp === fakeUser.totp;
}