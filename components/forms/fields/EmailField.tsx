"use client";

import { TextField } from "@mui/material";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function EmailField({ value, onChange }: Props) {
  return (
    <TextField
      label="Email"
      type="email"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
    />
  );
}