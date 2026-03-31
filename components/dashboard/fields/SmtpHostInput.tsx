"use client";

import { TextField } from "@mui/material";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function SmtpHostInput({ value, onChange }: Props) {
  return (
    <TextField
      label="SMTP Host"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
    />
  );
}