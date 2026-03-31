"use client";

import { TextField } from "@mui/material";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
};

export default function PasswordInput({
  label = "Password",
  value,
  onChange,
}: Props) {
  return (
    <TextField
      label={label}
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
    />
  );
}