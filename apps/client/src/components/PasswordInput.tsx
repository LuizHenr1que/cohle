import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Password field with a show/hide eye. */
export function PasswordInput({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...rest} type={show ? "text" : "password"} className={`${className ?? ""} pr-12`} />
      <button type="button" tabIndex={-1} onClick={() => setShow((v) => !v)} aria-label={show ? "Ocultar senha" : "Mostrar senha"} title={show ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted hover:text-ink">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
  );
}
