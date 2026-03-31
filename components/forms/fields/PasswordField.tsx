"use client";

import { TextField } from "@mui/material";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function PasswordField({ value, onChange }: Props) {
  return (
    <TextField
      label="Password"
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
    />
  );
}