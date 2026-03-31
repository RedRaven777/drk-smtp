"use client";

import { TextField } from "@mui/material";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function TotpField({ value, onChange }: Props) {
  const handleChange = (input: string) => {
    const numeric = input.replace(/\D/g, "");
    if (numeric.length <= 6) {
      onChange(numeric);
    }
  };

  return (
    <TextField
      label="TOTP Code"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      inputProps={{
        maxLength: 6,
        inputMode: "numeric",
        style: { letterSpacing: "10px", textAlign: "center" },
      }}
      fullWidth
    />
  );
}