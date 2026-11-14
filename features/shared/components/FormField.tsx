import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export type FormControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  required?: boolean;
  className: string;
};

const controlClassName =
  "mt-space-xs min-h-[42px] w-full rounded border border-outline-variant bg-surface-container-lowest px-space-sm py-space-xs font-body-sm text-body-sm text-on-surface focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-container-low";

export function FormInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={props.className ?? controlClassName} />;
}

export function FormSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={props.className ?? controlClassName} />;
}

export function FormTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={`${controlClassName} min-h-28 ${props.className ?? ""}`} />
  );
}

export function FormField({
  id,
  label,
  helperText,
  error,
  required = false,
  children,
}: {
  id: string;
  label: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  children: (props: FormControlProps) => ReactNode;
}) {
  const describedBy =
    [helperText ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") ||
    undefined;
  const controlProps: FormControlProps = {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    required,
    className: controlClassName,
  };

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="font-label-md text-label-md text-on-surface">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-status-danger-text">
            *
          </span>
        ) : null}
      </label>
      {children(controlProps)}
      {helperText ? (
        <p
          id={`${id}-help`}
          className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant"
        >
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          className="mt-space-xs font-body-sm text-body-sm text-status-danger-text"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
