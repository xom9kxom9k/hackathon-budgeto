import { forwardRef, type ChangeEvent, type InputHTMLAttributes } from 'react';

type TotpPinInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'maxLength'> & {
  value: string;
  error?: string;
};

export const TotpPinInput = forwardRef<HTMLInputElement, TotpPinInputProps>(function TotpPinInput(
  { value, onChange, error, disabled, ...props },
  ref,
) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6);
    onChange?.(event);
  }

  return (
    <div className="pin-field">
      <div className="pin-input" data-error={Boolean(error)}>
        {Array.from({ length: 6 }, (_, index) => (
          <span aria-hidden="true" className="pin-cell" key={index}>
            {value[index] ?? ''}
          </span>
        ))}
        <input
          {...props}
          ref={ref}
          autoComplete="one-time-code"
          className="pin-native-input"
          disabled={disabled}
          inputMode="numeric"
          maxLength={6}
          onChange={handleChange}
          pattern="[0-9]*"
          type="text"
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error && props.id ? `${props.id}-error` : props['aria-describedby']}
        />
      </div>
      {error && (
        <span id={props.id ? `${props.id}-error` : undefined} className="form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
});
