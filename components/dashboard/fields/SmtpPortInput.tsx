"use client";

import { TextField } from "@mui/material";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function SmtpPortInput({ value, onChange }: Props) {
  return (
    <TextField
      label="SMTP Port"
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
    />
  );
}